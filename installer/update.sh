#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "$SCRIPT_DIR/common.sh" ]]; then
    if command -v curl &>/dev/null; then
        curl -fsSL https://raw.githubusercontent.com/SynchronizesTeams/SyncPanel/main/installer/common.sh -o "$SCRIPT_DIR/common.sh" 2>/dev/null || true
    elif command -v wget &>/dev/null; then
        wget -q https://raw.githubusercontent.com/SynchronizesTeams/SyncPanel/main/installer/common.sh -O "$SCRIPT_DIR/common.sh" 2>/dev/null || true
    fi
fi

if [[ -f "$SCRIPT_DIR/common.sh" ]]; then
    source "$SCRIPT_DIR/common.sh"
else
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    CYAN='\033[0;36m'
    NC='\033[0m'
    info() { echo -e "${CYAN}[INFO]${NC} $1"; }
    success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
    warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
    error() { echo -e "${RED}[ERROR]${NC} $1"; }
    check_root() { if [[ $EUID -ne 0 ]]; then error "This script must be run as root (use sudo)."; exit 1; fi; }
fi

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

SOURCE_ROOT=""
TMP_REPO_DIR=""

if [[ -d "$SCRIPT_DIR/../backend" ]]; then
    SOURCE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
else
    info "Downloading latest SyncPanel code from GitHub..."
    TMP_REPO_DIR=$(mktemp -d)
    git clone --depth 1 https://github.com/SynchronizesTeams/SyncPanel.git "$TMP_REPO_DIR"
    SOURCE_ROOT="$TMP_REPO_DIR"
fi

info "Updating application source code..."
cp -rf "$SOURCE_ROOT/backend/"* "$INSTALL_DIR/backend/"
cp -rf "$SOURCE_ROOT/frontend/"* "$INSTALL_DIR/frontend/"
cp -rf "$SOURCE_ROOT/installer/"* "$INSTALL_DIR/installer/"
cp -rf "$SOURCE_ROOT/cli/"* "$INSTALL_DIR/cli/"

if [[ -n "$TMP_REPO_DIR" && -d "$TMP_REPO_DIR" ]]; then
    rm -rf "$TMP_REPO_DIR"
fi

info "Running database migrations..."
php artisan migrate --force

info "Restarting background queue workers..."
systemctl restart cloudpanel-worker.service || true

info "Bringing application out of maintenance mode..."
php artisan up

success "SyncPanel successfully updated to latest version!"
