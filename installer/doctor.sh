#!/usr/bin/env bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo -e "${CYAN}"
echo "======================================================="
echo "            SyncPanel Doctor Diagnostics              "
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
check_service "SyncPanel Application" "cloudpanel.service"
check_service "SyncPanel Queue Worker" "cloudpanel-worker.service"
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
