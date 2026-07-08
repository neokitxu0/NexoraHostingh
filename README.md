# NexoraHosting — VPS Deployment Guide

A complete WHMCS-style hosting billing and automation platform.

## Requirements

- Ubuntu 22.04 / Debian 12 VPS (minimum 1 vCPU, 1 GB RAM)
- Node.js 20+ (`nvm` recommended)
- PostgreSQL 15+
- PM2 (process manager)
- Nginx (reverse proxy)

---

## 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install PM2
npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

---

## 2. Setup PostgreSQL

```bash
sudo -u postgres psql

# Inside psql:
CREATE USER nexora WITH PASSWORD 'YourStrongPassword123!';
CREATE DATABASE nexorahosting OWNER nexora;
GRANT ALL PRIVILEGES ON DATABASE nexorahosting TO nexora;
\q
```

---

## 3. Clone and Configure

```bash
git clone https://github.com/yourusername/nexorahosting.git
cd nexorahosting

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
nano .env
```

**.env contents:**
```env
DATABASE_URL=postgresql://nexora:YourStrongPassword123!@localhost:5432/nexorahosting
SESSION_SECRET=your-super-secret-key-change-this-in-production
JWT_SECRET=another-secret-key-change-this-too
NODE_ENV=production
PORT=8080
```

---

## 4. Push Database Schema

```bash
# Build the db lib first
pnpm --filter @workspace/db run push
```

If drizzle-kit asks about column conflicts interactively, run SQL manually:
```bash
psql $DATABASE_URL -f schema.sql
```

---

## 5. Seed Demo Data (Optional)

```bash
pnpm --filter @workspace/scripts run seed
```

---

## 6. Build the Project

```bash
# Build API server
pnpm --filter @workspace/api-server run build

# Build frontend
pnpm --filter @workspace/nexora run build
```

---

## 7. Start with PM2

```bash
# Start API server
pm2 start "node --enable-source-maps artifacts/api-server/dist/index.mjs" \
  --name nexora-api \
  --env production

# Serve frontend with a static server (or use Nginx)
npm install -g serve
pm2 start "serve -s artifacts/nexora/dist -l 3000" --name nexora-frontend

# Save PM2 config and enable on boot
pm2 save
pm2 startup
# Follow the printed command to enable startup
```

---

## 8. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/nexorahosting
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    # License system API
    location /api/lic {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/nexorahosting /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 9. SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 10. Default Credentials

| System | Email | Password |
|--------|-------|----------|
| NexoraHosting Admin | admin@nexorahosting.com | admin123 |
| Demo Client | demo@example.com | demo123 |
| License Manager Admin | nexora@localhost.com | nexora |

**⚠️ Change all passwords immediately after first login!**

---

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application → Bot
3. Enable **Server Members Intent** in Bot settings
4. Copy the Bot Token
5. In NexoraHosting Admin → Settings → Discord → paste Bot Token
6. Invite the bot to your server with `bot` + `applications.commands` scope

---

## Pterodactyl Panel Integration

1. In your Pterodactyl admin panel: go to **Application API** → create API key
2. In NexoraHosting Admin → Integrations → Pterodactyl:
   - Set Panel URL (e.g. `https://panel.yourdomain.com`)
   - Set Application API Key
3. When adding products: select **Pterodactyl** integration, set Node/Nest/Egg IDs and resource limits

---

## Proxmox VE Integration

1. In Proxmox: create an API token with `PVEAdmin` role
2. In NexoraHosting Admin → Integrations → Proxmox:
   - Set Proxmox URL (e.g. `https://pve.yourdomain.com:8006`)
   - Set API Token ID (e.g. `root@pam!nexora`)
   - Set API Token Secret
3. When adding products: select **Proxmox** integration, set node name, storage, template VMID

---

## Updating

```bash
git pull
pnpm install
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/nexora run build
pm2 restart nexora-api
pm2 restart nexora-frontend
```
