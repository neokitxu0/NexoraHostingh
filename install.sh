#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║       NexoraHosting — Auto Installer v3.0                       ║
# ║       Supports: Debian 10/11/12/13 · Ubuntu 20/22/24 LTS       ║
# ║       Usage  : sudo bash install.sh                             ║
# ╚══════════════════════════════════════════════════════════════════╝
set -euo pipefail
IFS=$'\n\t'

# ── Colours ──────────────────────────────────────────────────────────
RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m'
CYAN='\033[0;36m' MAGENTA='\033[0;35m' BOLD='\033[1m' DIM='\033[2m' RESET='\033[0m'

info()    { echo -e "${CYAN}  ➜${RESET}  $*"; }
success() { echo -e "${GREEN}  ✔${RESET}  $*"; }
warn()    { echo -e "${YELLOW}  ⚠${RESET}  $*"; }
die()     { echo -e "${RED}  ✘  $*${RESET}"; exit 1; }
step()    { echo -e "\n${BOLD}${MAGENTA}▸ $*${RESET}"; }
hr()      { echo -e "${DIM}────────────────────────────────────────────────────────${RESET}"; }

spinner() {
  local pid=$1 msg=$2 delay=0.12
  local frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
  local i=0
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r${CYAN}  ${frames[$i]}${RESET}  %s..." "$msg"
    i=$(( (i+1) % ${#frames[@]} ))
    sleep "$delay"
  done
  printf "\r%-70s\r" " "
}

run() {
  # run "Description" cmd args...
  local msg="$1"; shift
  ("$@" >> /tmp/nx_install.log 2>&1) &
  local pid=$!
  spinner "$pid" "$msg"
  if wait "$pid"; then
    success "$msg"
  else
    echo -e "${RED}  ✘  $msg FAILED${RESET}"
    echo -e "${DIM}  → tail /tmp/nx_install.log  (last 20 lines below)${RESET}"
    tail -20 /tmp/nx_install.log | sed 's/^/    /'
    die "Aborting. Fix the error above and re-run."
  fi
}

# ── Root check ───────────────────────────────────────────────────────
[[ "$EUID" -eq 0 ]] || die "Run as root:  sudo bash install.sh"

# ── Detect OS ────────────────────────────────────────────────────────
if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  OS_ID="${ID:-unknown}"
  OS_CODENAME="${VERSION_CODENAME:-}"
  OS_VERSION="${VERSION_ID:-0}"
else
  die "Cannot detect OS. /etc/os-release not found."
fi

case "$OS_ID" in
  ubuntu)
    [[ $(echo "$OS_VERSION >= 20.04" | bc -l) -eq 1 ]] || \
      warn "Ubuntu $OS_VERSION is old — Ubuntu 20.04+ recommended."
    ;;
  debian)
    [[ "$OS_VERSION" -ge 10 ]] 2>/dev/null || \
      warn "Debian $OS_VERSION is old — Debian 10+ recommended."
    ;;
  *)
    warn "OS '$OS_ID' is not officially supported. Proceeding anyway..."
    ;;
esac

# ── Fix any broken dpkg state first ──────────────────────────────────
export DEBIAN_FRONTEND=noninteractive
dpkg --configure -a 2>/dev/null || true
apt-get -f install -y -qq    2>/dev/null || true

# ── Banner ───────────────────────────────────────────────────────────
clear
echo -e "${BOLD}${CYAN}"
echo "  ███╗   ██╗███████╗██╗  ██╗ ██████╗ ██████╗  █████╗ "
echo "  ████╗  ██║██╔════╝╚██╗██╔╝██╔═══██╗██╔══██╗██╔══██╗"
echo "  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║██████╔╝███████║"
echo "  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║██╔══██╗██╔══██║"
echo "  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝██║  ██║██║  ██║"
echo "  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝"
echo -e "${RESET}${DIM}       WHMCS-style Hosting Billing Platform — v3.0${RESET}"
echo ""
echo -e "  OS detected : ${CYAN}${PRETTY_NAME:-$OS_ID $OS_VERSION}${RESET}"
hr

# ── Script location check ────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$SCRIPT_DIR/pnpm-workspace.yaml" ]] || \
  die "Run this script from the NexoraHosting project root."

INSTALL_DIR="/opt/nexorahosting"
LOG_FILE="/var/log/nexorahosting-install.log"
: > "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1
echo -e "${DIM}  Install log: $LOG_FILE${RESET}\n"

# ── Collect user input ───────────────────────────────────────────────
echo -e "${BOLD}  Setup Configuration${RESET}\n"

ask() {
  # ask VAR "Label" "default" secret?
  local var="$1" label="$2" default="${3:-}" secret="${4:-no}"
  while true; do
    if [[ "$secret" == "yes" ]]; then
      read -rsp "  ${BOLD}${label}${RESET}${default:+ [****]}: " val; echo ""
    else
      read -rp  "  ${BOLD}${label}${RESET}${default:+ [${DIM}${default}${RESET}]}: " val
    fi
    val="${val:-$default}"
    if [[ -n "$val" ]]; then printf -v "$var" '%s' "$val"; return; fi
    warn "Required — please enter a value."
  done
}

ask DOMAIN        "Domain or Server IP"          "localhost"
ask ADMIN_EMAIL   "Admin Email"                  "admin@nexorahosting.com"
ask ADMIN_PASSWORD "Admin Password (min 8 chars)" ""    "yes"
while [[ ${#ADMIN_PASSWORD} -lt 8 ]]; do
  warn "Too short — minimum 8 characters."; ask ADMIN_PASSWORD "Admin Password" "" "yes"
done

ask DB_NAME "PostgreSQL database name" "nexorahosting"
ask DB_USER "PostgreSQL username"      "nexorauser"
ask DB_PASS "PostgreSQL password"      ""   "yes"
while [[ ${#DB_PASS} -lt 6 ]]; do
  warn "Too short — minimum 6 characters."; ask DB_PASS "PostgreSQL password" "" "yes"
done

echo ""
echo -e "  ${BOLD}Razorpay (optional — press Enter to skip):${RESET}"
read -rp  "  Razorpay Key ID    : " RAZORPAY_KEY_ID     || true
read -rsp "  Razorpay Key Secret: " RAZORPAY_KEY_SECRET  || true
echo ""

SESSION_SECRET="$(openssl rand -hex 32)"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}"

echo ""
hr
echo -e "  ${BOLD}Summary:${RESET}"
echo -e "  Domain      : ${CYAN}$DOMAIN${RESET}"
echo -e "  Admin Email : ${CYAN}$ADMIN_EMAIL${RESET}"
echo -e "  DB Name     : ${CYAN}$DB_NAME${RESET}"
echo -e "  Install Dir : ${CYAN}$INSTALL_DIR${RESET}"
hr
echo ""
read -rp "  Proceed with installation? [y/N] " OK
[[ "$OK" =~ ^[Yy]$ ]] || { echo "  Aborted."; exit 0; }
echo ""

# ════════════════════════════════════════════════════════════════════
#  STEP 1 — System packages
# ════════════════════════════════════════════════════════════════════
step "Step 1/12 — System Packages"

run "Updating apt cache" apt-get update -qq

PKGS=(
  curl git rsync wget unzip gnupg2 ca-certificates lsb-release
  build-essential software-properties-common apt-transport-https
  nginx ufw fail2ban
  postgresql postgresql-contrib
)

# certbot differs slightly between Debian and Ubuntu
if [[ "$OS_ID" == "debian" && "$OS_VERSION" -ge 12 ]]; then
  PKGS+=(certbot python3-certbot-nginx)
elif [[ "$OS_ID" == "ubuntu" ]]; then
  PKGS+=(certbot python3-certbot-nginx)
else
  PKGS+=(certbot python3-certbot-nginx)
fi

run "Installing packages (nginx, postgresql, ufw, fail2ban ...)" \
  apt-get install -y -qq "${PKGS[@]}"

# ════════════════════════════════════════════════════════════════════
#  STEP 2 — Node.js 20
# ════════════════════════════════════════════════════════════════════
step "Step 2/12 — Node.js 20"

CURRENT_NODE=0
command -v node &>/dev/null && CURRENT_NODE="$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v')" || true

if [[ "$CURRENT_NODE" -lt 20 ]]; then
  run "Downloading NodeSource setup script" \
    bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /tmp/nx_install.log 2>&1"
  run "Installing Node.js 20" \
    apt-get install -y -qq nodejs
else
  success "Node.js $(node -v) — already installed"
fi

# Verify
NODE_VER="$(node -v)"
NPM_VER="$(npm -v)"
success "node $NODE_VER  |  npm $NPM_VER"

# ════════════════════════════════════════════════════════════════════
#  STEP 3 — pnpm & PM2
# ════════════════════════════════════════════════════════════════════
step "Step 3/12 — pnpm & PM2"

run "Installing pnpm (package manager)"  bash -c "npm install -g pnpm@latest   > /tmp/nx_install.log 2>&1"
run "Installing pm2  (process manager)"  bash -c "npm install -g pm2@latest    > /tmp/nx_install.log 2>&1"
success "pnpm $(pnpm -v)  |  pm2 $(pm2 -v)"

# ════════════════════════════════════════════════════════════════════
#  STEP 4 — PostgreSQL
# ════════════════════════════════════════════════════════════════════
step "Step 4/12 — PostgreSQL Database"

systemctl enable postgresql --quiet 2>/dev/null || true
systemctl start  postgresql          2>/dev/null || true
sleep 2  # give postgres a moment

# Create user (idempotent)
sudo -u postgres psql -tc \
  "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c \
  "CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASS}';" > /dev/null

# Create DB (idempotent)
sudo -u postgres psql -tc \
  "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c \
  "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"  > /dev/null

sudo -u postgres psql -c \
  "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" > /dev/null
sudo -u postgres psql -d "${DB_NAME}" -c \
  "GRANT ALL ON SCHEMA public TO ${DB_USER};" > /dev/null

success "Database '${DB_NAME}' ready (user: ${DB_USER})"

# ════════════════════════════════════════════════════════════════════
#  STEP 5 — Deploy files
# ════════════════════════════════════════════════════════════════════
step "Step 5/12 — Deploying Project Files"

if [[ -d "$INSTALL_DIR" ]]; then
  BACKUP="/opt/nexorahosting_bak_$(date +%Y%m%d_%H%M%S)"
  info "Previous installation found — backing up to $BACKUP"
  cp -r "$INSTALL_DIR" "$BACKUP"
  pm2 delete nexora-api 2>/dev/null || true
fi

mkdir -p "$INSTALL_DIR"

run "Copying files to $INSTALL_DIR" \
  rsync -a --delete \
    --exclude='node_modules'    \
    --exclude='.git'            \
    --exclude='*/dist'          \
    --exclude='*/.tsbuildinfo'  \
    --exclude='*.zip'           \
    "${SCRIPT_DIR}/" "${INSTALL_DIR}/"

chmod 750 "$INSTALL_DIR"

# ════════════════════════════════════════════════════════════════════
#  STEP 6 — .env files
# ════════════════════════════════════════════════════════════════════
step "Step 6/12 — Environment Configuration"

cat > "${INSTALL_DIR}/.env" << ENV
# NexoraHosting Production Config — $(date)
DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=${SESSION_SECRET}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
NODE_ENV=production
PORT=8080
BASE_PATH=/api
RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID:-}
RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET:-}
ENV

chmod 600 "${INSTALL_DIR}/.env"
cp  "${INSTALL_DIR}/.env" "${INSTALL_DIR}/artifacts/api-server/.env"

cat > "${INSTALL_DIR}/artifacts/nexora/.env" << FENV
VITE_API_BASE=/api
NODE_ENV=production
FENV

success ".env files created (mode 600 — root only)"

# ════════════════════════════════════════════════════════════════════
#  STEP 7 — Install Node dependencies
# ════════════════════════════════════════════════════════════════════
step "Step 7/12 — Installing Node.js Dependencies"

run "pnpm install (this may take 1-2 min)" \
  bash -c "cd ${INSTALL_DIR} && pnpm install --frozen-lockfile > /tmp/nx_install.log 2>&1"

# ════════════════════════════════════════════════════════════════════
#  STEP 8 — Build shared libs + apps
# ════════════════════════════════════════════════════════════════════
step "Step 8/12 — Building Application"

run "Building shared TypeScript libraries" \
  bash -c "cd ${INSTALL_DIR} && pnpm run typecheck:libs > /tmp/nx_install.log 2>&1"

run "Building API server" \
  bash -c "cd ${INSTALL_DIR}/artifacts/api-server && pnpm run build > /tmp/nx_install.log 2>&1"

run "Building frontend (React + Vite)" \
  bash -c "cd ${INSTALL_DIR}/artifacts/nexora && pnpm run build > /tmp/nx_install.log 2>&1"

# ════════════════════════════════════════════════════════════════════
#  STEP 9 — Database schema + seed
# ════════════════════════════════════════════════════════════════════
step "Step 9/12 — Database Setup"

export DATABASE_URL ADMIN_EMAIL ADMIN_PASSWORD

run "Pushing database schema (Drizzle ORM)" \
  bash -c "cd ${INSTALL_DIR} && pnpm --filter @workspace/db run push --force > /tmp/nx_install.log 2>&1"

run "Seeding database (admin + demo data)" \
  bash -c "cd ${INSTALL_DIR} && pnpm --filter @workspace/scripts run seed > /tmp/nx_install.log 2>&1"

success "Admin account created: ${ADMIN_EMAIL}"

# ════════════════════════════════════════════════════════════════════
#  STEP 10 — PM2
# ════════════════════════════════════════════════════════════════════
step "Step 10/12 — Process Manager (PM2)"

cat > "${INSTALL_DIR}/ecosystem.config.cjs" << 'PM2CFG'
module.exports = {
  apps: [{
    name              : "nexora-api",
    script            : "./artifacts/api-server/dist/index.mjs",
    cwd               : "/opt/nexorahosting",
    env_file          : "/opt/nexorahosting/.env",
    instances         : 1,
    exec_mode         : "fork",
    autorestart       : true,
    watch             : false,
    max_memory_restart: "512M",
    error_file        : "/var/log/nexorahosting-pm2-error.log",
    out_file          : "/var/log/nexorahosting-pm2-out.log",
    log_date_format   : "YYYY-MM-DD HH:mm:ss Z",
  }]
};
PM2CFG

pm2 delete nexora-api 2>/dev/null || true
pm2 start "${INSTALL_DIR}/ecosystem.config.cjs"
pm2 save --force

# Enable PM2 on boot (works on Debian & Ubuntu with systemd)
pm2 startup systemd -u root --hp /root --silent 2>/tmp/nx_pm2_startup.log || true
STARTUP_CMD="$(tail -1 /tmp/nx_pm2_startup.log)"
[[ "$STARTUP_CMD" == "sudo"* ]] && eval "$STARTUP_CMD" || systemctl enable pm2-root 2>/dev/null || true

success "PM2 running — nexora-api started"

# ════════════════════════════════════════════════════════════════════
#  STEP 11 — Nginx
# ════════════════════════════════════════════════════════════════════
step "Step 11/12 — Nginx Web Server"

FRONTEND_DIST="${INSTALL_DIR}/artifacts/nexora/dist"

cat > /etc/nginx/sites-available/nexorahosting << NGINXCFG
# NexoraHosting — Nginx Config (generated $(date))

limit_req_zone \$binary_remote_addr zone=api_zone:10m   rate=30r/m;
limit_req_zone \$binary_remote_addr zone=login_zone:10m  rate=5r/m;

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    access_log /var/log/nginx/nexorahosting-access.log;
    error_log  /var/log/nginx/nexorahosting-error.log warn;

    # Security headers
    add_header X-Frame-Options         "SAMEORIGIN"   always;
    add_header X-Content-Type-Options  "nosniff"      always;
    add_header X-XSS-Protection        "1; mode=block" always;
    add_header Referrer-Policy         "strict-origin-when-cross-origin" always;

    # API — proxied to Node.js on port 8080
    location /api {
        limit_req zone=api_zone burst=20 nodelay;
        proxy_pass          http://127.0.0.1:8080;
        proxy_http_version  1.1;
        proxy_set_header    Upgrade             \$http_upgrade;
        proxy_set_header    Connection          "upgrade";
        proxy_set_header    Host               \$host;
        proxy_set_header    X-Real-IP          \$remote_addr;
        proxy_set_header    X-Forwarded-For    \$proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto  \$scheme;
        proxy_read_timeout  60s;
        proxy_connect_timeout 10s;
    }

    # Login stricter rate limit
    location /api/auth/login {
        limit_req zone=login_zone burst=5 nodelay;
        proxy_pass         http://127.0.0.1:8080;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-Proto \$scheme;
    }

    # Frontend assets (long cache)
    location /assets/ {
        root     ${FRONTEND_DIST};
        expires  1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # React SPA fallback
    location / {
        root  ${FRONTEND_DIST};
        index index.html;
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml text/javascript image/svg+xml;

    client_max_body_size 10M;
}
NGINXCFG

ln -sf /etc/nginx/sites-available/nexorahosting /etc/nginx/sites-enabled/nexorahosting
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t 2>/tmp/nx_nginx_test.log || die "Nginx config invalid — check /tmp/nx_nginx_test.log"
systemctl enable nginx  --quiet
systemctl reload nginx
success "Nginx configured for ${DOMAIN}"

# ── Optional SSL ──────────────────────────────────────────────────────
if [[ "$DOMAIN" != "localhost" && "$DOMAIN" != "127.0.0.1" ]]; then
  echo ""
  read -rp "  Setup HTTPS with Let's Encrypt? [y/N] " SSL_OK
  if [[ "$SSL_OK" =~ ^[Yy]$ ]]; then
    read -rp "  Email for SSL notifications: " SSL_EMAIL
    if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
               -m "$SSL_EMAIL" --redirect 2>/tmp/nx_certbot.log; then
      success "HTTPS enabled — auto-renews via systemd timer"
      systemctl enable --now certbot.timer 2>/dev/null || true
    else
      warn "SSL failed — run manually later: certbot --nginx -d ${DOMAIN}"
    fi
  fi
fi

# ════════════════════════════════════════════════════════════════════
#  STEP 12 — Security hardening
# ════════════════════════════════════════════════════════════════════
step "Step 12/12 — Security (Firewall + Fail2ban)"

# UFW firewall
ufw --force reset    > /dev/null 2>&1
ufw default deny incoming  > /dev/null
ufw default allow outgoing > /dev/null
ufw allow ssh        > /dev/null
ufw allow 80/tcp     > /dev/null
ufw allow 443/tcp    > /dev/null
ufw --force enable   > /dev/null
success "Firewall active (22 SSH, 80 HTTP, 443 HTTPS)"

# Fail2ban
systemctl enable fail2ban --quiet 2>/dev/null || true
systemctl start  fail2ban         2>/dev/null || true
success "Fail2ban active (brute-force protection)"

# ── Health check ──────────────────────────────────────────────────────
step "Health Check"
sleep 4
HTTP_STATUS="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/api/healthz 2>/dev/null || echo 000)"
if [[ "$HTTP_STATUS" == "200" ]]; then
  success "API server responded HTTP 200 ✔"
else
  warn "API returned HTTP ${HTTP_STATUS} — may still be starting. Check: pm2 logs nexora-api"
fi

# ── Generate helper scripts ───────────────────────────────────────────
cat > "${INSTALL_DIR}/update.sh" << 'UPDSH'
#!/usr/bin/env bash
# NexoraHosting — Update Script
set -euo pipefail
INSTALL_DIR="/opt/nexorahosting"
cd "$INSTALL_DIR"
echo "→ Installing dependencies..."
pnpm install --frozen-lockfile
echo "→ Building libs..."
pnpm run typecheck:libs
echo "→ Building API..."
(cd artifacts/api-server && pnpm run build)
echo "→ Building frontend..."
(cd artifacts/nexora   && pnpm run build)
echo "→ Restarting API..."
pm2 restart nexora-api
echo "→ Reloading Nginx..."
nginx -t && systemctl reload nginx
echo "✔ Update complete!"
UPDSH
chmod +x "${INSTALL_DIR}/update.sh"

cat > "${INSTALL_DIR}/uninstall.sh" << UNSH
#!/usr/bin/env bash
set -euo pipefail
echo "⚠  This will COMPLETELY remove NexoraHosting from this server."
read -rp "Type 'yes' to confirm: " C
[[ "\$C" == "yes" ]] || { echo "Aborted."; exit 0; }
pm2 delete nexora-api 2>/dev/null || true
pm2 save --force
rm -f /etc/nginx/sites-enabled/nexorahosting
rm -f /etc/nginx/sites-available/nexorahosting
nginx -t && systemctl reload nginx
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER     IF EXISTS ${DB_USER};" 2>/dev/null || true
rm -rf /opt/nexorahosting
echo "✔ NexoraHosting removed."
UNSH
chmod +x "${INSTALL_DIR}/uninstall.sh"

# ── Final summary ─────────────────────────────────────────────────────
echo ""
hr
echo -e "${BOLD}${GREEN}"
echo "   ✔  NexoraHosting is installed and running!"
echo -e "${RESET}"
hr
echo ""
echo -e "  ${BOLD}🌐 Website${RESET}        http://${DOMAIN}"
echo -e "  ${BOLD}🔑 Admin login${RESET}    ${ADMIN_EMAIL}"
echo -e "  ${BOLD}📁 Install path${RESET}   ${INSTALL_DIR}"
echo -e "  ${BOLD}📋 Full log${RESET}       ${LOG_FILE}"
echo ""
echo -e "  ${BOLD}Commands:${RESET}"
echo -e "    ${DIM}pm2 logs nexora-api${RESET}                  ← Live logs"
echo -e "    ${DIM}pm2 restart nexora-api${RE
