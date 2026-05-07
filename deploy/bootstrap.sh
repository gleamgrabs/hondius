#!/usr/bin/env bash
# bootstrap.sh — Hondius Watch deploy on Hetzner via Cloudflare Tunnel.
#
# Why Cloudflare Tunnel: this server already runs whale_nginx on host
# ports 80/443. We use a Cloudflare Tunnel so hondius doesn't touch any
# host port — cloudflared establishes outbound connections to Cloudflare's
# edge, and Cloudflare delivers traffic to hondius via the internal
# docker network. Zero conflict with whale or cita-engine.
#
# Prerequisites (do these in your browser BEFORE running):
#   1. Sign up free at https://dash.cloudflare.com
#   2. Add domain: hondius-watch.com → Cloudflare gives you 2 nameservers
#   3. Update nameservers at Spaceship → wait for "Active" in Cloudflare
#      (usually 5-30 minutes). Re-add Resend's DNS records (DKIM, SPF, MX)
#      in Cloudflare.
#   4. Cloudflare Zero Trust → Networks → Tunnels → Create a tunnel
#      Name it "hondius" → choose Cloudflared → copy the token (eyJ...)
#   5. In the same tunnel UI, add a Public Hostname:
#        Subdomain: (leave blank)    Domain: hondius-watch.com
#        Service: HTTP://hondius-tracker:3000
#      (and a second one with subdomain "www" pointing to same service)
#
# WORKFLOW (on the server, as root):
#   ssh root@62.238.9.117
#   mkdir -p /opt/hondius
#   nano /opt/hondius/.env       # paste keys (see deploy/.env.example)
#   bash <(curl -fsSL https://raw.githubusercontent.com/gleamgrabs/hondius/main/deploy/bootstrap.sh)
#
# What this does:
#   1. Verifies Docker is present (does NOT install — server already has it)
#   2. Creates `hondius` user
#   3. Clones repo to /opt/hondius (preserves any pre-placed .env)
#   4. Builds and starts docker compose (hondius-tracker + cloudflared)
#   5. Confirms healthcheck passes
#
# What this does NOT do:
#   ✘ Install or modify host nginx
#   ✘ Touch certbot / Let's Encrypt
#   ✘ Bind any host port
#   ✘ Read or modify ~/whale, /opt/cita-engine, /opt/cita-engine-http
#   ✘ Modify cita user

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'
log()  { printf "${GREEN}▸${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}!${NC} %s\n" "$*"; }
die()  { printf "${RED}✗${NC} %s\n" "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run as root"

REPO_URL="${REPO_URL:-https://github.com/gleamgrabs/hondius.git}"
APP_DIR="${APP_DIR:-/opt/hondius}"
APP_USER="${APP_USER:-hondius}"
ENV_FILE="$APP_DIR/.env"

# ── Preflight ───────────────────────────────────────────────────────
cat <<EOF

▸ Hondius Watch bootstrap (Cloudflare Tunnel mode)
─────────────────────────────────────────────────────────
  ✔ User created:          ${APP_USER}
  ✔ App directory:         ${APP_DIR}
  ✔ Containers:            hondius-tracker, hondius-cloudflared
  ✔ Network:               internal docker bridge "hondius" (no host ports)

  ✘ NEVER touched on this server:
       ~/whale/                    (Polymarket trading bot)
       /opt/cita-engine/           (cita catcher)
       /opt/cita-engine-http/      (Phase 3 R&D)
       cita user / cita group
       host nginx, certbot, port 80, port 443
EOF
echo
echo "  Existing /opt projects (will not be modified):"
ls -d /opt/*/ 2>/dev/null | sed 's/^/       /' || true
echo
echo "  Listening sockets (will not be modified):"
ss -tlnp 2>/dev/null | awk 'NR>1 {print "       " $1, $4}' | head -10 || true
echo

if [[ "${SKIP_CONFIRM:-0}" != "1" ]]; then
  read -rp "Proceed? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || die "Aborted"
fi
echo

# ── Docker check ────────────────────────────────────────────────────
command -v docker >/dev/null || die "Docker not found. Install: curl -fsSL https://get.docker.com | sh"
docker compose version >/dev/null 2>&1 || die "docker compose plugin not found"
log "Docker present — $(docker --version)"

# ── User ────────────────────────────────────────────────────────────
if ! id "$APP_USER" >/dev/null 2>&1; then
  log "Creating user $APP_USER"
  adduser "$APP_USER" --disabled-password --gecos "" >/dev/null
fi
usermod -aG docker "$APP_USER"
mkdir -p "$APP_DIR"

# ── Preserve pre-placed .env ────────────────────────────────────────
ENV_BACKUP=""
if [[ -f "$ENV_FILE" && ! -d "$APP_DIR/.git" ]]; then
  ENV_BACKUP=$(mktemp)
  cp "$ENV_FILE" "$ENV_BACKUP"
  log "Found pre-placed .env — preserving"
fi

# ── Clone or update repo ────────────────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  log "Updating existing clone"
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch --all
  sudo -u "$APP_USER" git -C "$APP_DIR" reset --hard origin/main
else
  log "Cloning $REPO_URL → $APP_DIR"
  TMP=$(mktemp -d)
  git clone "$REPO_URL" "$TMP" >/dev/null
  shopt -s dotglob nullglob
  for item in "$TMP"/*; do
    cp -r "$item" "$APP_DIR/"
  done
  shopt -u dotglob nullglob
  rm -rf "$TMP"
  chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
fi

# Restore preserved .env
if [[ -n "$ENV_BACKUP" && -f "$ENV_BACKUP" ]]; then
  mv "$ENV_BACKUP" "$ENV_FILE"
  chown "$APP_USER":"$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  log "Restored pre-placed .env"
fi

# ── Validate .env ───────────────────────────────────────────────────
[[ -f "$ENV_FILE" ]] || die "$ENV_FILE not found. Create it before running (see deploy/.env.example)."
chmod 600 "$ENV_FILE"
log "Using $ENV_FILE"

REQUIRED_VARS=(NEXT_PUBLIC_SITE_URL RESEND_API_KEY EMAIL_FROM BROADCAST_ADMIN_TOKEN CLOUDFLARE_TUNNEL_TOKEN)
MISSING=()
for v in "${REQUIRED_VARS[@]}"; do
  if ! grep -qE "^${v}=" "$ENV_FILE"; then
    MISSING+=("$v")
  fi
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
  die ".env is missing: ${MISSING[*]}"
fi

# ── Build + start ───────────────────────────────────────────────────
log "Building docker compose"
cd "$APP_DIR"
sudo -u "$APP_USER" docker compose build

log "Starting containers"
sudo -u "$APP_USER" docker compose up -d

log "Waiting for hondius-tracker healthcheck"
for i in {1..30}; do
  if sudo -u "$APP_USER" docker exec hondius-tracker \
       node -e "require('http').get('http://127.0.0.1:3000/api/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))" 2>/dev/null; then
    log "App healthy"
    break
  fi
  sleep 2
  [[ $i -eq 30 ]] && die "App did not become healthy in 60s. Check: cd $APP_DIR && docker compose logs hondius-tracker"
done

log "Cloudflared status (last 20 log lines):"
sudo -u "$APP_USER" docker compose logs --tail 20 cloudflared

# ── Done ────────────────────────────────────────────────────────────
echo
log "Bootstrap complete"
echo
echo "Next:"
echo "  1. Open https://hondius-watch.com — should serve the site"
echo "     (DNS + tunnel routing must be configured in Cloudflare beforehand)"
echo "  2. Subscribe modal appears after 4s — try it"
echo "  3. Logs:    cd $APP_DIR && docker compose logs -f"
echo "  4. Restart: cd $APP_DIR && docker compose restart"
echo "  5. Update:  cd $APP_DIR && git pull && docker compose up -d --build"
echo
echo "If https://hondius-watch.com gives 1000 / 1014 / 502 errors:"
echo "  - Check the tunnel status in Cloudflare Zero Trust → Networks → Tunnels"
echo "  - Verify Public Hostname → Service is set to: HTTP://hondius-tracker:3000"
echo "  - Verify CLOUDFLARE_TUNNEL_TOKEN in $ENV_FILE matches the tunnel"
