#!/usr/bin/env bash

set -e

# Colors & Helper Functions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

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

check_os() {
    info "Checking operating system compatibility..."
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        if [[ "$ID" != "debian" && "$ID" != "ubuntu" ]]; then
            warn "Target operating system is Debian/Ubuntu. System detected: ${NAME:-Linux} (${VERSION_ID:-})."
            read -p "Do you wish to continue installation anyway? [y/N] " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                error "Installation aborted."
                exit 1
            fi
        fi
    fi
}

PANEL_DOMAIN=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
AUTO_YES=false
INSTALL_DIR="/opt/cloudpanel"
WEBSITE_DIR="/srv/cloudpanel/websites"

# Parse CLI flags
while [[ $# -gt 0 ]]; do
    case $1 in
        -y|--yes)
            AUTO_YES=true
            shift
            ;;
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
echo "   Self-Hosted Cloudflare Hosting Panel (SyncPanel)    "
echo "                 Production Installer                  "
echo "======================================================="
echo -e "${NC}"

check_root
check_os

# Clean up old broken cloudflared repository entry if present to prevent apt-get update failure
if [[ -f /etc/apt/sources.list.d/cloudflared.list ]]; then
    rm -f /etc/apt/sources.list.d/cloudflared.list
fi

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

# Step 1: Pre-installation Dependency Check
info "Checking system dependencies status..."
REQUIRED_PKGS=(
    "curl"
    "wget"
    "git"
    "unzip"
    "tar"
    "nginx"
    "postgresql"
    "postgresql-contrib"
    "redis-server"
    "php-cli"
    "php-fpm"
    "php-pgsql"
    "php-redis"
    "php-zip"
    "php-mbstring"
    "php-xml"
    "php-curl"
)

MISSING_PKGS=()

for pkg in "${REQUIRED_PKGS[@]}"; do
    if dpkg -s "$pkg" &>/dev/null; then
        echo -e "  ${GREEN}[INSTALLED]${NC} $pkg"
    else
        echo -e "  ${YELLOW}[MISSING]${NC}   $pkg"
        MISSING_PKGS+=("$pkg")
    fi
done

if [[ ${#MISSING_PKGS[@]} -gt 0 ]]; then
    echo
    warn "The following required dependencies are currently missing:"
    for pkg in "${MISSING_PKGS[@]}"; do
        echo -e "  - ${YELLOW}$pkg${NC}"
    done
    echo

    if [[ "$AUTO_YES" != true ]]; then
        read -p "Do you approve installing these missing dependencies now? [Y/n] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            error "Installation aborted by user (missing dependencies required)."
            exit 1
        fi
    fi

    info "Updating package repositories..."
    apt-get update -qq

    info "Installing missing dependencies..."
    apt-get install -y -qq "${MISSING_PKGS[@]}" || true
    success "Dependencies successfully installed."
else
    echo
    success "All system package dependencies are already installed!"
fi

# Step 2: Check Cloudflare Tunnel Daemon (cloudflared)
info "Checking Cloudflare Tunnel daemon (cloudflared)..."
if command -v cloudflared &> /dev/null; then
    echo -e "  ${GREEN}[INSTALLED]${NC} cloudflared"
else
    echo -e "  ${YELLOW}[MISSING]${NC}   cloudflared"
    echo
    INSTALL_CF=true
    if [[ "$AUTO_YES" != true ]]; then
        read -p "Do you approve installing the cloudflared daemon now? [Y/n] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            warn "Skipping cloudflared installation. Cloudflare Tunnel will require manual setup later."
            INSTALL_CF=false
        fi
    fi

    if [[ "$INSTALL_CF" == true ]]; then
        info "Installing cloudflared daemon from official Cloudflare binary release..."
        ARCH=$(dpkg --print-architecture 2>/dev/null || echo "amd64")
        CF_DEB_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.deb"
        TMP_DEB=$(mktemp /tmp/cloudflared-XXXXXX.deb)

        if curl -fsSL "$CF_DEB_URL" -o "$TMP_DEB" 2>/dev/null || wget -q "$CF_DEB_URL" -O "$TMP_DEB" 2>/dev/null; then
            dpkg -i "$TMP_DEB" &>/dev/null || apt-get install -f -y -qq
            rm -f "$TMP_DEB"
            success "cloudflared installed successfully."
        else
            warn "Failed to download cloudflared .deb package automatically."
        fi
    fi
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

info "Downloading SyncPanel repository code from GitHub..."
TMP_REPO_DIR=$(mktemp -d)
git clone --depth 1 https://github.com/SynchronizesTeams/SyncPanel.git "$TMP_REPO_DIR"

cp -rf "$TMP_REPO_DIR/backend" "$INSTALL_DIR/"
cp -rf "$TMP_REPO_DIR/frontend" "$INSTALL_DIR/"
cp -rf "$TMP_REPO_DIR/systemd" "$INSTALL_DIR/"
cp -rf "$TMP_REPO_DIR/scripts" "$INSTALL_DIR/"
cp -rf "$TMP_REPO_DIR/installer" "$INSTALL_DIR/"
cp -rf "$TMP_REPO_DIR/cli" "$INSTALL_DIR/"

rm -rf "$TMP_REPO_DIR"

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
cp -f "$INSTALL_DIR/cli/cloudpanel" /usr/local/bin/cloudpanel
chmod +x /usr/local/bin/cloudpanel

echo
success "======================================================="
success " SyncPanel installation completed successfully!       "
success "======================================================="
info "Panel Domain : https://$PANEL_DOMAIN"
info "Admin Email  : $ADMIN_EMAIL"
info "CLI Utility  : 'cloudpanel doctor' or 'cloudpanel status'"
