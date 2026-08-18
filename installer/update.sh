#!/usr/bin/env bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)."
        exit 1
    fi
}

check_root

info "Starting SyncPanel update sequence..."

INSTALL_DIR="/opt/cloudpanel"

if [[ ! -d "$INSTALL_DIR" ]]; then
    error "SyncPanel installation not found at $INSTALL_DIR"
    exit 1
fi

info "Putting application into maintenance mode..."
cd "$INSTALL_DIR/backend"
php artisan down || true

TMP_REPO_DIR=$(mktemp -d)
info "Downloading latest SyncPanel code from GitHub..."
git clone --depth 1 https://github.com/SynchronizesTeams/SyncPanel.git "$TMP_REPO_DIR"

info "Updating application source code..."
cp -rf "$TMP_REPO_DIR/backend/"* "$INSTALL_DIR/backend/"
cp -rf "$TMP_REPO_DIR/frontend/"* "$INSTALL_DIR/frontend/"
cp -rf "$TMP_REPO_DIR/installer/"* "$INSTALL_DIR/installer/"
cp -rf "$TMP_REPO_DIR/cli/"* "$INSTALL_DIR/cli/"

rm -rf "$TMP_REPO_DIR"

info "Installing PHP dependencies via Composer..."
cd "$INSTALL_DIR/backend"
if command -v composer &>/dev/null; then
    composer install --no-interaction --prefer-dist --optimize-autoloader --no-audit --no-security-blocking 2>/dev/null || composer install --no-interaction --prefer-dist
fi

info "Running database migrations..."
php artisan migrate --force

info "Building React frontend assets..."
cd "$INSTALL_DIR/frontend"
if command -v npm &>/dev/null; then
    npm install --no-audit
    npm run build
fi

chown -R cloudpanel:cloudpanel "$INSTALL_DIR"

info "Restarting background queue workers..."
systemctl restart cloudpanel-worker.service || true

info "Bringing application out of maintenance mode..."
cd "$INSTALL_DIR/backend"
php artisan up

success "SyncPanel successfully updated to latest version!"
