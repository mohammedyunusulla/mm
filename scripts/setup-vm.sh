#!/usr/bin/env bash
# ============================================================
# One-time VM setup script for Mandi Manager
# Run as root: sudo bash setup-vm.sh
# ============================================================
set -euo pipefail

echo "=== Mandi Manager VM Setup ==="

# ── 1. System updates ─────────────────────────────────────────
apt-get update && apt-get upgrade -y

# ── 2. Install Node.js 20 LTS ────────────────────────────────
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v)  npm: $(npm -v)"

# ── 3. Install PM2 globally ──────────────────────────────────
npm install -g pm2
pm2 startup systemd -u "${SUDO_USER:-azureuser}" --hp "/home/${SUDO_USER:-azureuser}" || true

# ── 4. Install PostgreSQL 16 ─────────────────────────────────
if ! command -v psql &>/dev/null; then
  sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
  apt-get update
  apt-get install -y postgresql-16
fi
systemctl enable postgresql
systemctl start postgresql
echo "PostgreSQL: $(psql --version)"

# ── 5. Create PostgreSQL databases & user ─────────────────────
DB_USER="${DB_USER:-mandiapp}"
DB_PASS="${DB_PASS:-$(openssl rand -base64 24)}"

sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}' CREATEDB;
  END IF;
END
\$\$;
SQL

# Create master database
sudo -u postgres createdb --owner="${DB_USER}" mandi_master 2>/dev/null || echo "mandi_master already exists"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  PostgreSQL user: ${DB_USER}"
echo "║  PostgreSQL pass: ${DB_PASS}"
echo "║  Master DB URL:   postgresql://${DB_USER}:${DB_PASS}@localhost:5432/mandi_master"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  SAVE THESE CREDENTIALS! Add them as GitHub secrets.    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── 6. Install Nginx ──────────────────────────────────────────
apt-get install -y nginx
systemctl enable nginx

# ── 7. Create app directories ─────────────────────────────────
APP_USER="${SUDO_USER:-azureuser}"
mkdir -p /opt/mandi/{backend,frontend}
chown -R "$APP_USER:$APP_USER" /opt/mandi

# ── 8. Copy Nginx config ─────────────────────────────────────
cat > /etc/nginx/sites-available/mandi <<'NGINX'
server {
    listen 80;
    server_name _;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:4000/health;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/mandi /etc/nginx/sites-enabled/mandi
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 9. Firewall ───────────────────────────────────────────────
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "=== VM setup complete ==="
echo "Next steps:"
echo "  1. Add GitHub secrets (see README)"
echo "  2. Push code to trigger CI/CD"
echo "  3. (Optional) Set up SSL with: sudo certbot --nginx"
