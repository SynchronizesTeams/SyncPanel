#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

check_root

echo -e "${RED}"
echo "======================================================="
echo "        CloudPanel Uninstallation Wizard              "
echo "======================================================="
echo -e "${NC}"

warn "WARNING: This operation will remove CloudPanel application services and systemd units."
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

info "Stopping CloudPanel systemd services..."
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

success "CloudPanel uninstallation finished."
