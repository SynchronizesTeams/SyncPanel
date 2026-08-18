#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

echo -e "${CYAN}"
echo "======================================================="
echo "            CloudPanel Doctor Diagnostics             "
echo "======================================================="
echo -e "${NC}"

check_service() {
    local name="$1"
    local service="$2"

    if systemctl is-active --quiet "$service" 2>/dev/null; then
        success "[OK] $name ($service is running)"
    else
        error "[FAIL] $name ($service is stopped)"
    fi
}

check_service "Nginx Web Server" "nginx"
check_service "PostgreSQL Database Engine" "postgresql"
check_service "Redis Broker" "redis-server"
check_service "CloudPanel Application" "cloudpanel.service"
check_service "CloudPanel Queue Worker" "cloudpanel-worker.service"
check_service "Cloudflare Tunnel Daemon" "cloudflared"

echo
info "Checking website root permissions (/srv/cloudpanel/websites)..."
if [[ -d /srv/cloudpanel/websites ]]; then
    success "[OK] /srv/cloudpanel/websites exists."
else
    warn "[WARN] /srv/cloudpanel/websites directory is missing."
fi

echo
success "Doctor health inspection complete."
