#!/usr/bin/env bash
# bootstrap.sh — Hetzner provisioning for Hondius Watch.
#
# WORKFLOW A (recommended — matches typical multi-project server pattern):
#   ssh root@62.238.9.117
#   mkdir -p /opt/hondius
#   nano /opt/hondius/.env       # paste keys (template below)
#   bash <(curl -fsSL https://raw.githubusercontent.com/gleamgrabs/hondius/main/deploy/bootstrap.sh)
#
# WORKFLOW B (one-liner — keys via env vars):
#   ssh root@62.238.9.117
#   RESEND_API_KEY=re_xxx LETSENCRYPT_EMAIL=you@x.com \
#     bash <(curl -fsSL https://raw.githubusercontent.com/gleamgrabs/hondius/main/deploy/bootstrap.sh)
#
# .env template (Workflow A):
# ─────────────────────────────────────────
# NEXT_PUBLIC_SITE_URL=https://hondius-watch.com
# RESEND_API_KEY=re_your_real_key_here
# EMAIL_FROM=Hondius Watch <updates@hondius-watch.com>
# BROADCAST_ADMIN_TOKEN=long_random_string_here
# ─────────────────────────────────────────
#
# What it does:
#   1. Installs Docker (idempotent)
#   2. Creates `hondius` user, adds to docker group
#   3. Preserves existing .env if you placed one
#   4. Clones the repo to /opt/hondius
#   5. If no .env exists yet — generates one from env vars
#   6. Builds and starts docker compose on 127.0.0.1:3002
#   7. Installs nginx + certbot (idempotent)
#   8. Adds rate-limit zone, drops site config, issues Let's Encrypt cert

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
ENV_FILE="$APP_DIR/.env"

# ── Preflight: show what we will and will NOT touch ─────────────────
cat <<EOF

▸ Hondius Watch bootstrap — what this script will do
─────────────────────────────────────────────────────────
  ✔ Create user:           ${APP_USER}
  ✔ Create directory:      ${APP_DIR}
  ✔ Bind app to:           127.0.0.1:${APP_PORT}  (loopback only)
  ✔ Add nginx site:        /etc/nginx/sites-available/hondius
  ✔ Enable nginx site:     /etc/nginx/sites-enabled/hondius
  ✔ Issue SSL cert for:    ${DOMAIN}, www.${DOMAIN}

  ✘ NEVER touched:
       ~/whale/                        (Polymarket trading bot)
       /opt/cita-engine/               (cita catcher project)
       /opt/cita-engine-http/          (Phase 3 R&D)
       cita user / cita group
       any existing nginx sites-enabled entries

  Other detected processes / sockets on this server:
EOF
ss -tlnp 2>/dev/null | awk 'NR>1 {print "       " $0}' | head -10 || true
echo
echo "  Existing /opt projects:"
ls -d /opt/*/ 2>/dev/null | sed 's/^/       /' || true
echo
echo "  Existing nginx sites enabled (will NOT be modified):"
ls /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^/       /' || echo "       (nginx not yet installed)"
echo

if [[ "${SKIP_CONFIRM:-0}" != "1" ]]; then
  read -rp "Proceed? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || die "Aborted"
fi
echo

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

# ── 3. Port check ───────────────────────────────────────────────────
if ss -tlnp 2>/dev/null | grep -q ":$APP_PORT "; then
  die "Port $APP_PORT is already in use. Re-run with APP_PORT=NNNN bash bootstrap.sh"
fi
log "Port $APP_PORT free"

# ── 4. Preserve pre-placed .env (Workflow A) ────────────────────────
ENV_BACKUP=""
if [[ -f "$ENV_FILE" && ! -d "$APP_DIR/.git" ]]; then
  ENV_BACKUP=$(mktemp)
  cp "$ENV_FILE" "$ENV_BACKUP"
  log "Found pre-placed .env — preserving"
fi

# ── 5. Clone or update repo ─────────────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  log "Updating existing clone"
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --all
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard origin/main
else
  log "Cloning $REPO_URL → $APP_DIR"
  TMP=$(mktemp -d)
  git clone "$REPO_URL" "$TMP" >/dev/null
  # Move repo files into APP_DIR (which may already contain .env)
  shopt -s dotglob nullglob
  for item in "$TMP"/*; do
    cp -r "$item" "$APP_DIR/"
  done
  shopt -u dotglob nullglob
  rm -rf "$TMP"
  chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
fi

# Restore preserved .env (in case clone overwrote it)
if [[ -n "$ENV_BACKUP" && -f "$ENV_BACKUP" ]]; then
  mv "$ENV_BACKUP" "$ENV_FILE"
  chown "$APP_USER":"$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  log "Restored your pre-placed .env"
fi

# ── 6. Generate .env if not present (Workflow B fallback) ───────────
if [[ ! -f "$ENV_FILE" ]]; then
  log "No .env present — generating from env vars / prompts"
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
  log "BROADCAST_ADMIN_TOKEN saved in $ENV_FILE:"
  echo "  $ADMIN_TOKEN"
  echo "  ⚠ Save this somewhere safe — needed for broadcasts."
else
  log "Using $ENV_FILE (mode 600)"
  chmod 600 "$ENV_FILE"
fi

# Sanity check required vars
for v in NEXT_PUBLIC_SITE_URL RESEND_API_KEY EMAIL_FROM BROADCAST_ADMIN_TOKEN; do
  if ! grep -q "^${v}=" "$ENV_FILE"; then
    warn "$v not found in $ENV_FILE — app may not work correctly"
  fi
done

# ── 7. Build + start ────────────────────────────────────────────────
log "Building and starting docker compose"
cd "$APP_DIR"
sudo -u "$APP_USER" docker compose up -d --build

log "Waiting for healthcheck"
for i in {1..30}; do
  if curl -fsS "http://127.0.0.1:$APP_PORT/api/health" >/dev/null 2>&1; then
    log "App is healthy at http://127.0.0.1:$APP_PORT"
    break
  fi
  sleep 2
  [[ $i -eq 30 ]] && die "App did not become healthy in 60s. Check: cd $APP_DIR && docker compose logs"
done

# ── 8. Install nginx + certbot ──────────────────────────────────────
if ! command -v nginx >/dev/null; then
  log "Installing nginx + certbot"
  apt-get update -y
  apt-get install -y nginx certbot python3-certbot-nginx
fi

# ── 9. nginx rate-limit zone (idempotent) ───────────────────────────
if ! grep -q "subscribe_zone" /etc/nginx/nginx.conf; then
  log "Adding rate-limit zone to /etc/nginx/nginx.conf"
  sed -i '/^http {/a\    limit_req_zone $binary_remote_addr zone=subscribe_zone:10m rate=5r/m;' /etc/nginx/nginx.conf
fi

# ── 10. Pre-SSL HTTP-only site (certbot will rewrite to HTTPS) ─────
mkdir -p /var/www/certbot
cat >/etc/nginx/sites-available/hondius <<EOF
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
ln -sf /etc/nginx/sites-available/hondius /etc/nginx/sites-enabled/hondius

# ── Co-existence check: list other sites for visibility (don't touch) ─
log "Existing nginx sites — none modified except 'hondius':"
ls -1 /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^/    /' || true

nginx -t
systemctl reload nginx
log "nginx serving HTTP for $DOMAIN"

# ── 11. Let's Encrypt ──────────────────────────────────────────────
EMAIL="${LETSENCRYPT_EMAIL:-admin@${DOMAIN}}"
log "Requesting SSL certificate (email: $EMAIL)"
if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
        --redirect --email "$EMAIL" --agree-tos --no-eff-email --non-interactive; then
  log "SSL OK — https://${DOMAIN} now serving"
else
  warn "certbot failed — check that DNS A record points to this server, then re-run:"
  warn "  certbot --nginx -d $DOMAIN -d www.$DOMAIN --redirect --email $EMAIL --agree-tos"
fi

# ── Done ────────────────────────────────────────────────────────────
echo
log "Bootstrap complete"
echo
echo "Next steps:"
echo "  1. Open https://${DOMAIN} in your browser"
echo "  2. Subscribe modal appears after 4s — try it"
echo "  3. Logs:    cd $APP_DIR && docker compose logs -f"
echo "  4. Restart: cd $APP_DIR && docker compose restart"
echo "  5. Update:  cd $APP_DIR && git pull && docker compose up -d --build"
