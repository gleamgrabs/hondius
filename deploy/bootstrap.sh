#!/usr/bin/env bash
# bootstrap.sh — one-shot Hetzner provisioning for Hondius Watch.
#
# Usage on the server (as root):
#   bash <(curl -fsSL https://raw.githubusercontent.com/gleamgrabs/hondius/main/deploy/bootstrap.sh)
#
# Or, if you've already cloned the repo:
#   sudo bash /opt/hondius/deploy/bootstrap.sh
#
# What it does:
#   1. Installs Docker (if absent)
#   2. Creates the `hondius` user, adds to docker group
#   3. Clones the repo to /opt/hondius
#   4. Prompts for Resend API key + admin secret (or reads from env)
#   5. Writes /opt/hondius/.env
#   6. Builds and starts the docker compose stack on 127.0.0.1:3002
#   7. Installs nginx + certbot if absent
#   8. Drops in the rate-limit zone and the site config
#   9. Issues SSL via Let's Encrypt for hondius-watch.com + www.

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'
log()  { printf "${GREEN}▸${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}!${NC} %s\n" "$*"; }
die()  { printf "${RED}✗${NC} %s\n" "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run as root (sudo bash bootstrap.sh)"

REPO_URL="${REPO_URL:-https://github.com/gleamgrabs/hondius.git}"
APP_DIR="${APP_DIR:-/opt/hondius}"
APP_USER="${APP_USER:-hondius}"
APP_PORT="${APP_PORT:-3002}"
DOMAIN="${DOMAIN:-hondius-watch.com}"

# ── 1. Docker ───────────────────────────────────────────────────────
if ! command -v docker >/dev/null; then
  log "Installing Docker"
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  log "Docker present — $(docker --version)"
fi

if ! docker compose version >/dev/null 2>&1; then
  die "docker compose plugin not found — install docker-compose-plugin"
fi

# ── 2. User ─────────────────────────────────────────────────────────
if ! id "$APP_USER" >/dev/null 2>&1; then
  log "Creating user $APP_USER"
  adduser "$APP_USER" --disabled-password --gecos "" >/dev/null
fi
usermod -aG docker "$APP_USER"
mkdir -p "$APP_DIR"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# ── 3. Port check ───────────────────────────────────────────────────
if ss -tlnp 2>/dev/null | grep -q ":$APP_PORT "; then
  die "Port $APP_PORT is already in use. Pick another and re-run with APP_PORT=NNNN bash bootstrap.sh"
fi
log "Port $APP_PORT free"

# ── 4. Clone or update repo ─────────────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  log "Updating existing clone"
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --all
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard origin/main
else
  log "Cloning $REPO_URL → $APP_DIR"
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
fi

# ── 5. Prompt for env values ────────────────────────────────────────
ENV_FILE="$APP_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  log "Setting up .env"
  : "${RESEND_API_KEY:?Set RESEND_API_KEY env var before running, or paste it now:}"
  if [[ -z "${RESEND_API_KEY:-}" ]]; then
    read -rp "Resend API key (re_...): " RESEND_API_KEY
  fi
  ADMIN_TOKEN="${BROADCAST_ADMIN_TOKEN:-$(openssl rand -hex 32)}"
  cat >"$ENV_FILE" <<EOF
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}
RESEND_API_KEY=${RESEND_API_KEY}
EMAIL_FROM=Hondius Watch <updates@${DOMAIN}>
BROADCAST_ADMIN_TOKEN=${ADMIN_TOKEN}
EOF
  chown "$APP_USER":"$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  log "Generated BROADCAST_ADMIN_TOKEN — saved in $ENV_FILE (mode 600)"
  echo "  $ADMIN_TOKEN"
  echo "  ⚠ Save this somewhere safe — you'll need it for broadcasts."
else
  log ".env already exists, skipping"
fi

# ── 6. Build + start ────────────────────────────────────────────────
log "Building and starting docker compose"
cd "$APP_DIR"
sudo -u "$APP_USER" docker compose up -d --build

log "Waiting for healthcheck"
for i in {1..30}; do
  if curl -fsS http://127.0.0.1:$APP_PORT/api/health >/dev/null 2>&1; then
    log "App is healthy at http://127.0.0.1:$APP_PORT"
    break
  fi
  sleep 2
  [[ $i -eq 30 ]] && die "App did not become healthy in 60s. Check: docker compose logs"
done

# ── 7. Install nginx + certbot ──────────────────────────────────────
if ! command -v nginx >/dev/null; then
  log "Installing nginx + certbot"
  apt-get update -y
  apt-get install -y nginx certbot python3-certbot-nginx
fi

# ── 8. nginx rate-limit zone (idempotent) ───────────────────────────
if ! grep -q "subscribe_zone" /etc/nginx/nginx.conf; then
  log "Adding rate-limit zone to /etc/nginx/nginx.conf"
  sed -i '/^http {/a\    limit_req_zone $binary_remote_addr zone=subscribe_zone:10m rate=5r/m;' /etc/nginx/nginx.conf
fi

# Site config
cp "$APP_DIR/deploy/nginx-hondius.conf" /etc/nginx/sites-available/hondius
ln -sf /etc/nginx/sites-available/hondius /etc/nginx/sites-enabled/hondius

# Disable default site (only if it exists and would conflict)
if [[ -e /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
  log "Disabled default nginx site"
fi

# Pre-SSL: replace the SSL block with a temporary HTTP-only one for first certbot run
TEMP_NGINX=$(mktemp)
cat >"$TEMP_NGINX" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
mv "$TEMP_NGINX" /etc/nginx/sites-available/hondius
mkdir -p /var/www/certbot

nginx -t
systemctl reload nginx
log "nginx serving HTTP for $DOMAIN"

# ── 9. Let's Encrypt ────────────────────────────────────────────────
EMAIL="${LETSENCRYPT_EMAIL:-admin@${DOMAIN}}"
log "Requesting SSL certificate (email: $EMAIL)"
if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
        --redirect --email "$EMAIL" --agree-tos --no-eff-email --non-interactive; then
  log "SSL OK — https://${DOMAIN} should now serve"
else
  warn "certbot failed — check that DNS A record points to this server, then re-run:"
  warn "  certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect --email $EMAIL --agree-tos"
fi

# ── Done ────────────────────────────────────────────────────────────
log "Bootstrap complete"
echo
echo "Next steps:"
echo "  1. Open https://${DOMAIN} in your browser"
echo "  2. Subscribe modal should appear after 4 seconds — try it"
echo "  3. To send a broadcast (CLI):"
echo "       cd $APP_DIR && source .env"
echo "       BROADCAST_ADMIN_TOKEN=\$BROADCAST_ADMIN_TOKEN SITE_URL=\$NEXT_PUBLIC_SITE_URL \\"
echo "         node scripts/broadcast.mjs hondius-2026 --dry-run"
echo
echo "  4. View logs:    docker compose -f $APP_DIR/docker-compose.yml logs -f"
echo "  5. Restart app:  cd $APP_DIR && docker compose restart"
echo "  6. Update app:   cd $APP_DIR && git pull && docker compose up -d --build"
