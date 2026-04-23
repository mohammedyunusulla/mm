#!/usr/bin/env bash
# ============================================================
# Deployment script — called by GitHub Actions on the VM
# ============================================================
set -euo pipefail

APP_DIR="/opt/mandi"
DEPLOY_DIR="/tmp/deploy"
APP_USER="${SUDO_USER:-azureuser}"

echo "=== Deploying Mandi Manager ==="

# ── 1. Extract backend ────────────────────────────────────────
echo "Extracting backend..."
cd "$APP_DIR/backend"
tar xzf "$DEPLOY_DIR/backend.tar.gz" --strip-components=0

# Install production dependencies
npm ci --omit=dev --workspace=src/backend 2>/dev/null || npm install --omit=dev

# ── 2. Run Prisma migrations ─────────────────────────────────
echo "Running database migrations..."
cd "$APP_DIR/backend/src/backend"
npx prisma migrate deploy --schema=prisma/master.prisma
npx prisma migrate deploy --schema=prisma/schema.prisma

# ── 3. Extract frontend ──────────────────────────────────────
echo "Extracting frontend..."
cd "$APP_DIR/frontend"
tar xzf "$DEPLOY_DIR/frontend.tar.gz" --strip-components=0

# Install production dependencies
npm ci --omit=dev --workspace=src/frontend/web 2>/dev/null || npm install --omit=dev

# ── 4. Fix ownership ─────────────────────────────────────────
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ── 5. Restart services with PM2 ─────────────────────────────
echo "Restarting services..."
su - "$APP_USER" -c "
  cd $APP_DIR

  # Start/restart backend
  pm2 describe mandi-api > /dev/null 2>&1 && \
    pm2 restart mandi-api || \
    pm2 start $APP_DIR/backend/src/backend/dist/index.js \
      --name mandi-api \
      --cwd $APP_DIR/backend/src/backend \
      --env-file $APP_DIR/backend/.env \
      --max-memory-restart 512M

  # Start/restart frontend
  pm2 describe mandi-web > /dev/null 2>&1 && \
    pm2 restart mandi-web || \
    pm2 start npm \
      --name mandi-web \
      --cwd $APP_DIR/frontend/src/frontend/web \
      -- start

  pm2 save
"

# ── 6. Cleanup ────────────────────────────────────────────────
rm -rf "$DEPLOY_DIR"

echo "=== Deployment complete ==="
