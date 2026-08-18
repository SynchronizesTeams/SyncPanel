#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_root

info "Starting CloudPanel update sequence..."

INSTALL_DIR="/opt/cloudpanel"

if [[ ! -d "$INSTALL_DIR" ]]; then
    error "CloudPanel installation not found at $INSTALL_DIR"
    exit 1
fi

info "Putting application into maintenance mode..."
cd "$INSTALL_DIR/backend"
php artisan down || true

info "Updating application source code..."
cp -rf "$SCRIPT_DIR/../backend/"* "$INSTALL_DIR/backend/"
cp -rf "$SCRIPT_DIR/../frontend/"* "$INSTALL_DIR/frontend/"

info "Running database migrations..."
php artisan migrate --force

info "Restarting background queue workers..."
systemctl restart cloudpanel-worker.service || true

info "Bringing application out of maintenance mode..."
php artisan up

success "CloudPanel successfully updated to latest version!"
