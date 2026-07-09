#!/usr/bin/env bash
# ============================================================
#  NexoraHosting — Auto Installer
#  Tested on: Ubuntu 22.04 / 24.04 LTS (x86_64)
#  Run as:  bash install.sh
# ============================================================
set -euo pipefail

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET} $*"; }
success() { echo -e "${GREEN}[OK]${RESET}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; }
error()   { echo -e "${RED}[ERR]${RESET}  $*"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}══ $* ══${RESET}\n"; }

# ── Banner ───────────────────────────────────────────────────
clear
echo -e "${BOLD}${CYAN}"
cat << 'EOF'
 _   _                           _   _           _   _
| \ | | _____  _____  _ __ __ _| | | | ___  ___| |_(_)_ __   __ _
|  \| |/ _ \ \/ / _ \| '__/ _` | |_| |/ _ \/ __| __| | '_ \ / _` |
| |\  |  __/>  < (_) | | | (_| |  _  | (_) \__ \ |_| | | | | (_| |
|_| \_|\___/_/\_\___/|_|  \__,_|_| |_|\___/|___/\__|_|_| |_|\__, |
                                                               |___/
          Auto Installer — WHMCS-style Hosting Billing Platform
EOF
echo -e "${RESET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Root check ───────────────────────────────────────────────
if [[ "$EUID" -ne 0 ]]; then
  error "Please run as root: sudo bash install.sh"
fi

# ── Collect config ───────────────────────────────────────────
header "Configuration"

read -rp "$(echo -e "${BOLD}Domain / IP${RESET} (e.g. nexora.yourdomain.com): ")" DOMAIN
DOMAIN="${DOMAIN:-localhost}"

read -rp "$(echo -e "${BOLD}Admin Email${RESET}: ")" ADMIN_EMAIL
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@nexorahosting.com}"

while true; do
  read -rsp "$(echo -e "${BOLD}Admin Password${RESET} (min 8 chars): ")" ADMIN_PASSWORD
  echo ""
  if [[ ${#ADMIN_PASSWORD} -ge 8 ]]; then break
  else warn "Password too short, try again."; fi
done

read -rp "$(echo -e "${BOLD}PostgreSQL DB name${RESET} [nexorahosting]: ")" DB_NAME
DB_NAME="${DB_NAME:-nexorahosting}"

read -rp "$(echo -e "${BOLD}PostgreSQL DB user${RESET} [nexorauser]: ")" DB_USER
DB_USER="${DB_USER:-nexorauser}"

while true; do
  read -rsp "$(echo -e "${BOLD}PostgreSQL DB password${RESET}: ")" DB_PASS
  echo ""
  if [[ ${#DB_PASS} -ge 6 ]]; then break
  else warn "Password too short, try again."; fi
done

read -rsp "$(echo -e "${BOLD}Session Secret${RESET} (leave blank to auto-generate): ")" SESSION_SECRET
echo ""
if [[ -z "$SESSION_SECRET" ]]; then
  SESSION_SECRET=$(openssl rand -hex 32)
  info "Auto-generated session secret."
fi

read -rp "$(echo -e "${BOLD}Razorpay Key ID${RESET} (optional, press Enter to skip): ")" RAZORPAY_KEY_ID
read -rsp "$(echo -e "${BOLD}Razorpay Key Secret${RESET} (optional, press Enter to skip): ")" RAZORPAY_KEY_SECRET
echo ""

INSTALL_DIR="/opt/nexorahosting"
API_PORT=8080
FRONTEND_PORT=3000
NGINX_AVAILABLE="/etc/nginx/sites-available/nexorahosting"
NGINX_ENABLED="/etc/nginx/sites-enabled/nexorahosting"

echo ""
info "Install directory : $INSTALL_DIR"
info "Domain            : $DOMAIN"
info "Admin email       : $ADMIN_EMAIL"
info "DB name           : $DB_NAME"
echo ""
read -rp "$(echo -e "${BOLD}Continue? [y/N]${RESET} ")" CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# ── System packages ──────────────────────────────────────────
header "System Packages"

apt-get update -qq
apt-get install -y -qq \
  curl git unzip build-essential ca-certificates \
  nginx certbot python3-certbot-nginx \
  postgresql postgresql-contrib \
  > /dev/null

success "System packages installed"

# ── Node.js 20 ───────────────────────────────────────────────
header "Node.js 20"

if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null
  apt-get install -y -qq nodejs > /dev/null
fi
success "Node.js $(node -v)"

# ── pnpm ─────────────────────────────────────────────────────
header "pnpm"

if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm@latest > /dev/null
fi
success "pnpm $(pnpm -v)"

# ── PM2 ──────────────────────────────────────────────────────
header "PM2 (Process Manager)"

if ! command -v pm2 &>/dev/null; then
  npm install -g pm2 > /dev/null
fi
success "PM2 $(pm2 -v)"

# ── PostgreSQL setup ─────────────────────────────────────────
header "PostgreSQL"

systemctl enable --now postgresql > /dev/null 2>&1

sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};" > /dev/null 2>&1 || true
sudo -u postgres psql -c "DROP USER IF EXISTS ${DB_USER};" > /dev/null 2>&1 || true
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASS}';" > /dev/null
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" > /dev/null
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" > /dev/null

DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
success "Database '${DB_NAME}' created"

# ── Project files ────────────────────────────────────────────
header "Project Files"

if [[ -d "$INSTALL_DIR" ]]; then
  warn "Directory $INSTALL_DIR exists. Removing old installation..."
  pm2 delete nexora-api nexora-frontend 2>/dev/null || true
  rm -rf "$INSTALL_DIR"
fi

mkdir -p "$INSTALL_DIR"

# Copy from current directory if we're running from inside the project
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/pnpm-workspace.yaml" ]]; then
  info "Copying project files from $SCRIPT_DIR ..."
  rsync -a --exclude='node_modules' --exclude='.git' \
    --exclude='*/dist' --exclude='*/.tsbuildinfo' \
    "$SCRIPT_DIR/" "$INSTALL_DIR/"
  success "Files copied to $INSTALL_DIR"
else
  error "Run this script from the root of the NexoraHosting project folder."
fi

cd "$INSTALL_DIR"

# ── .env file ────────────────────────────────────────────────
header "Environment Variables"

cat > "$INSTALL_DIR/.env" << ENV
DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=${SESSION_SECRET}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
NODE_ENV=production
PORT=${API_PORT}
BASE_PATH=/api
RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID:-}
RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET:-}
ENV

# Also write per-artifact .env files
cp "$INSTALL_DIR/.env" "$INSTALL_DIR/artifacts/api-server/.env"

cat > "$INSTALL_DIR/artifacts/nexora/.env" << FENV
VITE_API_BASE=/api
NODE_ENV=production
FENV

success ".env files written"

# ── Install dependencies ─────────────────────────────────────
header "Installing Dependencies"

pnpm install --frozen-lockfile 2>&1 | tail -5
success "Dependencies installed"

# ── Build libs ───────────────────────────────────────────────
header "Building Shared Libraries"

pnpm run typecheck:libs 2>&1 | tail -5
success "Libs built"

# ── Push DB schema ───────────────────────────────────────────
header "Database Schema"

# Load env so drizzle can connect
export DATABASE_URL
pnpm --filter @workspace/db run push --force 2>&1 | tail -10
success "Schema pushed to database"

# ── Seed database ────────────────────────────────────────────
header "Seeding Database"

export ADMIN_EMAIL ADMIN_PASSWORD
pnpm --filter @workspace/scripts run seed 2>&1 | tail -10
success "Database seeded (admin: $ADMIN_EMAIL)"

# ── Build API server ─────────────────────────────────────────
header "Building API Server"

cd "$INSTALL_DIR/artifacts/api-server"
pnpm run build 2>&1 | tail -5
success "API server built"

# ── Build frontend ───────────────────────────────────────────
header "Building Frontend"

cd "$INSTALL_DIR/artifacts/nexora"
pnpm run build 2>&1 | tail -5
success "Frontend built"

cd "$INSTALL_DIR"

# ── PM2 ecosystem ────────────────────────────────────────────
header "PM2 Process Configuration"

cat > "$INSTALL_DIR/ecosystem.config.cjs" << 'PM2'
module.exports = {
  apps: [
    {
      name: "nexora-api",
      script: "./artifacts/api-server/dist/index.mjs",
      cwd: "/opt/nexorahosting",
      env_file: "/opt/nexorahosting/.env",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
    }
  ]
};
PM2

success "PM2 ecosystem written"

# ── Start with PM2 ───────────────────────────────────────────
header "Starting Services"

pm2 delete nexora-api 2>/dev/null || true
pm2 start "$INSTALL_DIR/ecosystem.config.cjs" --env production
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

success "API server running via PM2"

# ── Nginx config ─────────────────────────────────────────────
header "Nginx Web Server"

FRONTEND_DIST="$INSTALL_DIR/artifacts/nexora/dist"

cat > "$NGINX_AVAILABLE" << NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    # Static frontend
    root ${FRONTEND_DIST};
    index index.html;

    # API proxy
    location /api {
        proxy_pass         http://127.0.0.1:${API_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # React SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
NGINX

ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t && systemctl reload nginx
success "Nginx configured for $DOMAIN"

# ── SSL (optional) ───────────────────────────────────────────
if [[ "$DOMAIN" != "localhost" && "$DOMAIN" != "127.0.0.1" ]]; then
  header "SSL Certificate (Let's Encrypt)"
  read -rp "$(echo -e "${BOLD}Setup HTTPS with Let's Encrypt? [y/N]${RESET} ")" SSL_CONFIRM
  if [[ "$SSL_CONFIRM" =~ ^[Yy]$ ]]; then
    read -rp "$(echo -e "${BOLD}Email for SSL notifications${RESET}: ")" SSL_EMAIL
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL" && \
      success "SSL certificate installed — site is now HTTPS" || \
      warn "SSL setup failed. You can run: certbot --nginx -d $DOMAIN"
  fi
fi

# ── Firewall ─────────────────────────────────────────────────
header "Firewall"

if command -v ufw &>/dev/null; then
  ufw allow 22/tcp  > /dev/null 2>&1 || true
  ufw allow 80/tcp  > /dev/null 2>&1 || true
  ufw allow 443/tcp > /dev/null 2>&1 || true
  ufw --force enable > /dev/null 2>&1 || true
  success "UFW firewall configured (22, 80, 443)"
else
  warn "ufw not found — configure your firewall manually"
fi

# ── Done ─────────────────────────────────────────────────────
header "Installation Complete"

echo -e "${GREEN}${BOLD}"
echo "  ✓  NexoraHosting is live!"
echo -e "${RESET}"
echo "  🌐 URL          : http://${DOMAIN}"
echo "  🔑 Admin login  : ${ADMIN_EMAIL}"
echo "  📁 Install dir  : ${INSTALL_DIR}"
echo "  📜 API logs     : pm2 logs nexora-api"
echo "  ♻️  Restart API  : pm2 restart nexora-api"
echo "  🔄 Update site  : cd $INSTALL_DIR && bash install.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Security reminder: keep your .env file private!${RESET}"
echo "  $INSTALL_DIR/.env"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
