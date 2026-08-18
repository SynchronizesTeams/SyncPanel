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

echo -e "${RED}"
echo "======================================================="
echo "        SyncPanel Uninstallation Wizard               "
echo "======================================================="
echo -e "${NC}"

warn "WARNING: This operation will remove SyncPanel application services and systemd units."
echo
echo "What should happen to hosted static website files in /srv/cloudpanel/websites?"
echo "1) KEEP website files intact (Recommended)"
echo "2) DELETE website files permanently"
echo "3) Cancel Uninstallation"
echo
read -p "Select option [1-3]: " UNINSTALL_OPT

case $UNINSTALL_OPT in
    1)
        info "Preserving website files..."
        REMOVE_DATA=false
        ;;
    2)
        warn "Website data will be deleted."
        REMOVE_DATA=true
        ;;
    *)
        info "Uninstallation cancelled."
        exit 0
        ;;
esac

info "Stopping SyncPanel systemd services..."
systemctl stop cloudpanel.service cloudpanel-worker.service cloudpanel-scheduler.service || true
systemctl disable cloudpanel.service cloudpanel-worker.service cloudpanel-scheduler.service || true

info "Removing systemd service files..."
rm -f /etc/systemd/system/cloudpanel*.service
systemctl daemon-reload

info "Removing application installation directory /opt/cloudpanel..."
rm -rf /opt/cloudpanel

info "Removing Nginx configuration links..."
rm -rf /etc/nginx/sites-available/cloudpanel
rm -rf /etc/nginx/sites-enabled/cloudpanel*.conf

if [[ "$REMOVE_DATA" == true ]]; then
    info "Deleting hosted website files in /srv/cloudpanel/websites..."
    rm -rf /srv/cloudpanel/websites
fi

rm -f /usr/local/bin/cloudpanel

success "SyncPanel uninstallation finished."
