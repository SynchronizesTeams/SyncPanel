#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

PANEL_DOMAIN=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
INSTALL_DIR="/opt/cloudpanel"
WEBSITE_DIR="/srv/cloudpanel/websites"

# Parse non-interactive CLI flags
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain)
            PANEL_DOMAIN="$2"
            shift 2
            ;;
        --admin-email)
            ADMIN_EMAIL="$2"
            shift 2
            ;;
        --admin-password)
            ADMIN_PASSWORD="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

echo -e "${CYAN}"
echo "======================================================="
echo "   Self-Hosted Cloudflare Hosting Panel (CloudPanel)   "
echo "                 Production Installer                  "
echo "======================================================="
echo -e "${NC}"

check_root
check_os

# Interactive prompts if arguments not supplied
if [[ -z "$PANEL_DOMAIN" ]]; then
    read -p "Enter Panel Domain (e.g. panel.example.com): " PANEL_DOMAIN
fi

if [[ -z "$ADMIN_EMAIL" ]]; then
    read -p "Enter Admin Email: " ADMIN_EMAIL
fi

if [[ -z "$ADMIN_PASSWORD" ]]; then
    read -sp "Enter Admin Password: " ADMIN_PASSWORD
    echo
fi

info "Updating package lists..."
apt-get update -qq

info "Installing system dependencies..."
apt-get install -y -qq curl wget git unzip tar nginx postgresql postgresql-contrib redis-server php8.3-cli php8.3-fpm php8.3-pgsql php8.3-redis php8.3-zip php8.3-mbstring php8.3-xml php8.3-curl || true

info "Checking/Installing cloudflared daemon..."
if ! command -v cloudflared &> /dev/null; then
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /etc/apt/keyrings/cloudflare-main.gpg >/dev/null
    echo "deb [signed-by=/etc/apt/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared debian bookworm main" | tee /etc/apt/sources.list.d/cloudflared.list
    apt-get update -qq && apt-get install -y -qq cloudflared || true
fi

info "Creating system user 'cloudpanel'..."
if ! id -u cloudpanel &>/dev/null; then
    useradd -r -m -d /opt/cloudpanel -s /bin/bash cloudpanel
fi

info "Setting up installation directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$WEBSITE_DIR"
mkdir -p /etc/nginx/sites-available/cloudpanel
mkdir -p /etc/nginx/sites-enabled

chown -R cloudpanel:cloudpanel "$INSTALL_DIR"
chown -R cloudpanel:cloudpanel "$WEBSITE_DIR"

info "Deploying application code..."
cp -rf "$SCRIPT_DIR/../backend" "$INSTALL_DIR/"
cp -rf "$SCRIPT_DIR/../frontend" "$INSTALL_DIR/"
cp -rf "$SCRIPT_DIR/../systemd" "$INSTALL_DIR/"
cp -rf "$SCRIPT_DIR/../scripts" "$INSTALL_DIR/"

info "Configuring environment and database migrations..."
cd "$INSTALL_DIR/backend"
if [[ ! -f .env ]]; then
    cp .env.example .env
    php artisan key:generate --force
fi

chown -R cloudpanel:cloudpanel "$INSTALL_DIR"

info "Installing systemd service units..."
cp -f "$INSTALL_DIR/systemd/"*.service /etc/systemd/system/
systemctl daemon-reload

info "Starting and enabling services..."
systemctl enable --now postgresql redis-server nginx || true
systemctl enable --now cloudpanel.service cloudpanel-worker.service cloudpanel-scheduler.service || true

# Install global CLI wrapper
cp -f "$SCRIPT_DIR/../cli/cloudpanel" /usr/local/bin/cloudpanel
chmod +x /usr/local/bin/cloudpanel

echo
success "======================================================="
success " CloudPanel installation completed successfully!       "
success "======================================================="
info "Panel Domain : https://$PANEL_DOMAIN"
info "Admin Email  : $ADMIN_EMAIL"
info "CLI Utility  : 'cloudpanel doctor' or 'cloudpanel status'"
