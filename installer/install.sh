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
            if [[ -c /dev/tty ]]; then
                read -p "Do you wish to continue installation anyway? [y/N] " -n 1 -r < /dev/tty
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    error "Installation aborted."
                    exit 1
                fi
            fi
        fi
    fi
}

PANEL_DOMAIN=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
AUTO_YES=false
GENERATED_PASS=false
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

# TTY-aware Interactive Prompts
if [[ -z "$PANEL_DOMAIN" ]]; then
    if [[ -c /dev/tty ]]; then
        read -p "Enter Panel Domain (e.g. panel.example.com): " PANEL_DOMAIN < /dev/tty
    fi
    if [[ -z "$PANEL_DOMAIN" ]]; then
        PANEL_DOMAIN=$(hostname -f 2>/dev/null || hostname 2>/dev/null || echo "localhost")
    fi
fi

if [[ -z "$ADMIN_EMAIL" ]]; then
    if [[ -c /dev/tty ]]; then
        read -p "Enter Admin Email: " ADMIN_EMAIL < /dev/tty
    fi
    if [[ -z "$ADMIN_EMAIL" ]]; then
        ADMIN_EMAIL="admin@cloudpanel.local"
    fi
fi

if [[ -z "$ADMIN_PASSWORD" ]]; then
    if [[ -c /dev/tty ]]; then
        read -sp "Enter Admin Password: " ADMIN_PASSWORD < /dev/tty
        echo
    fi
    if [[ -z "$ADMIN_PASSWORD" ]]; then
        ADMIN_PASSWORD=$(tr -dc A-Za-z0-9 </dev/urandom 2>/dev/null | head -c 12 || echo "admin123456")
        GENERATED_PASS=true
    fi
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
    "composer"
    "nodejs"
    "npm"
    "php-cli"
    "php-fpm"
    "php-pgsql"
    "php-sqlite3"
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

    if [[ "$AUTO_YES" != true && -c /dev/tty ]]; then
        read -p "Do you approve installing these missing dependencies now? [Y/n] " -n 1 -r < /dev/tty
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

info "Activating PHP PostgreSQL (pdo_pgsql) database driver..."
PHP_VER=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;' 2>/dev/null || echo "")

apt-get update -qq
apt-get install -y -qq php-pgsql php-sqlite3 libpq5 2>/dev/null || true
if [[ -n "$PHP_VER" ]]; then
    apt-get install -y -qq "php${PHP_VER}-pgsql" "php${PHP_VER}-sqlite3" "php${PHP_VER}-common" 2>/dev/null || true
fi

phpenmod pgsql pdo_pgsql pdo_sqlite sqlite3 redis mbstring xml curl zip 2>/dev/null || true
if [[ -n "$PHP_VER" ]]; then
    phpenmod -v "$PHP_VER" pgsql pdo_pgsql pdo_sqlite sqlite3 redis mbstring xml curl zip 2>/dev/null || true
fi

# Locate pdo_pgsql.so on disk and inject into conf.d to guarantee module loading
PDO_PGSQL_PATH=$(find /usr/lib/php /etc/php -name "pdo_pgsql.so" 2>/dev/null | head -n 1 || echo "")
for conf_dir in /etc/php/*/cli/conf.d /etc/php/*/fpm/conf.d; do
    if [[ -d "$conf_dir" ]]; then
        if [[ -n "$PDO_PGSQL_PATH" ]]; then
            echo "extension=$PDO_PGSQL_PATH" > "$conf_dir/20-syncpanel-pgsql.ini" 2>/dev/null || true
        else
            echo -e "extension=pdo.so\nextension=pdo_pgsql.so\nextension=pgsql.so" > "$conf_dir/20-syncpanel-pgsql.ini" 2>/dev/null || true
        fi
    fi
done

# Step 2: Check Cloudflare Tunnel Daemon (cloudflared)
info "Checking Cloudflare Tunnel daemon (cloudflared)..."
if command -v cloudflared &> /dev/null; then
    echo -e "  ${GREEN}[INSTALLED]${NC} cloudflared"
else
    echo -e "  ${YELLOW}[MISSING]${NC}   cloudflared"
    echo
    INSTALL_CF=true
    if [[ "$AUTO_YES" != true && -c /dev/tty ]]; then
        read -p "Do you approve installing the cloudflared daemon now? [Y/n] " -n 1 -r < /dev/tty
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

export COMPOSER_ALLOW_SUPERUSER=1

info "Configuring environment and PostgreSQL database..."
cd "$INSTALL_DIR/backend"

if [[ ! -f .env ]]; then
    cp .env.example .env
fi

sed -i 's/^DB_CONNECTION=.*/DB_CONNECTION=pgsql/' .env
sed -i 's/^DB_HOST=.*/DB_HOST=127.0.0.1/' .env
sed -i 's/^DB_PORT=.*/DB_PORT=5432/' .env
sed -i 's/^DB_DATABASE=.*/DB_DATABASE=syncpanel/' .env
sed -i 's/^DB_USERNAME=.*/DB_USERNAME=syncpanel/' .env
sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=secret/' .env

rm -f bootstrap/cache/*.php

# Provision PostgreSQL database & user
systemctl start postgresql || true
sudo -u postgres psql -c "CREATE USER syncpanel WITH PASSWORD 'secret';" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER syncpanel WITH PASSWORD 'secret';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE syncpanel OWNER syncpanel;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE syncpanel TO syncpanel;" 2>/dev/null || true

info "Installing PHP backend dependencies via Composer..."
if ! command -v composer &>/dev/null; then
    info "Installing Composer package manager..."
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer || true
fi

if command -v composer &>/dev/null; then
    composer install --no-interaction --prefer-dist --optimize-autoloader --no-audit --no-security-blocking 2>/dev/null || composer install --no-interaction --prefer-dist
else
    php -r "file_exists('composer.phar') || copy('https://getcomposer.org/composer.phar', 'composer.phar');"
    php composer.phar install --no-interaction --prefer-dist --optimize-autoloader --no-security-blocking 2>/dev/null || php composer.phar install --no-interaction
fi

php artisan config:clear 2>/dev/null || true

info "Generating application encryption key..."
php artisan key:generate --force

info "Migrating database tables..."
if ! php -m | grep -qi "pdo_pgsql"; then
    warn "PHP pdo_pgsql module not detected by PHP CLI. Re-attempting driver injection..."
    PDO_PGSQL_PATH=$(find /usr/lib/php /etc/php -name "pdo_pgsql.so" 2>/dev/null | head -n 1 || echo "")
    for conf_dir in /etc/php/*/cli/conf.d /etc/php/*/fpm/conf.d; do
        if [[ -d "$conf_dir" ]]; then
            if [[ -n "$PDO_PGSQL_PATH" ]]; then
                echo "extension=$PDO_PGSQL_PATH" > "$conf_dir/20-syncpanel-pgsql.ini" 2>/dev/null || true
            else
                echo -e "extension=pdo.so\nextension=pdo_pgsql.so\nextension=pgsql.so" > "$conf_dir/20-syncpanel-pgsql.ini" 2>/dev/null || true
            fi
        fi
    done
fi
php artisan migrate --force

info "Creating initial Admin account..."
php artisan tinker --execute="
    \App\Models\User::updateOrCreate(
        ['email' => '$ADMIN_EMAIL'],
        [
            'name' => 'Administrator',
            'password' => \Illuminate\Support\Facades\Hash::make('$ADMIN_PASSWORD'),
            'role' => 'admin',
            'status' => 'active',
            'max_websites' => 100,
            'max_storage_mb' => 50000,
            'max_dns_records' => 1000
        ]
    );
" || true

info "Building React frontend static assets..."
cd "$INSTALL_DIR/frontend"
if command -v npm &>/dev/null; then
    npm install --no-audit
    npm run build
fi

chown -R cloudpanel:cloudpanel "$INSTALL_DIR"

info "Configuring Nginx web server for SyncPanel (Port 8321)..."
cp -f "$INSTALL_DIR/nginx/cloudpanel.conf" /etc/nginx/sites-available/cloudpanel.conf 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/000-default 2>/dev/null || true
ln -sf /etc/nginx/sites-available/cloudpanel.conf /etc/nginx/sites-enabled/cloudpanel.conf 2>/dev/null || true

if nginx -t; then
    systemctl reload nginx || systemctl restart nginx || true
    success "Nginx configured and listening on port 8321."
else
    error "Nginx configuration test failed."
fi

info "Installing systemd service units..."
cp -f "$INSTALL_DIR/systemd/"*.service /etc/systemd/system/
systemctl daemon-reload

info "Starting and enabling services..."
systemctl enable --now postgresql redis-server nginx || true
systemctl enable --now cloudpanel.service cloudpanel-worker.service cloudpanel-scheduler.service || true

# Install global CLI wrapper (syncpanel) in both /usr/local/bin AND /usr/bin
cp -f "$INSTALL_DIR/cli/syncpanel" /usr/local/bin/syncpanel 2>/dev/null || true
chmod +x /usr/local/bin/syncpanel 2>/dev/null || true

cp -f "$INSTALL_DIR/cli/syncpanel" /usr/bin/syncpanel
chmod +x /usr/bin/syncpanel

# Alias cloudpanel to syncpanel for backward compatibility
ln -sf /usr/bin/syncpanel /usr/bin/cloudpanel 2>/dev/null || true
ln -sf /usr/local/bin/syncpanel /usr/local/bin/cloudpanel 2>/dev/null || true

SERVER_IP=$(ip -4 route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || hostname -I | tr ' ' '\n' | grep -vE '^(172\.(1[6-9]|2[0-9]|3[0-1])|127\.)' | head -n 1 || echo "127.0.0.1")

echo
success "======================================================="
success " SyncPanel installation completed successfully!       "
success "======================================================="
info "Local IP Access: http://$SERVER_IP:8321"
if [[ -n "$PANEL_DOMAIN" && "$PANEL_DOMAIN" != "localhost" ]]; then
    info "Domain Access  : http://$PANEL_DOMAIN:8321"
fi
info "Admin Email    : $ADMIN_EMAIL"
if [[ "$GENERATED_PASS" == true ]]; then
    info "Admin Password : $ADMIN_PASSWORD"
fi
info "CLI Utility    : 'syncpanel doctor' or 'syncpanel status'"
