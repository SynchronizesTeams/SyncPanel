#!/usr/bin/env bash

set -e

BACKUP_DIR="/opt/cloudpanel/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/cloudpanel_backup_$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"
TEMP_DUMP="/tmp/cloudpanel_dump_$TIMESTAMP"
mkdir -p "$TEMP_DUMP"

echo "[INFO] Creating CloudPanel backup..."

# Dump database
if command -v pg_dump &> /dev/null; then
    pg_dump -U cloudpanel cloudpanel > "$TEMP_DUMP/db_dump.sql" || true
fi

# Copy backend .env
if [[ -f /opt/cloudpanel/backend/.env ]]; then
    cp /opt/cloudpanel/backend/.env "$TEMP_DUMP/.env"
fi

tar -czf "$BACKUP_FILE" -C "$TEMP_DUMP" .
rm -rf "$TEMP_DUMP"

echo "[SUCCESS] Backup created at: $BACKUP_FILE"
