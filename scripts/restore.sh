#!/usr/bin/env bash

set -e

BACKUP_TAR="$1"

if [[ -z "$BACKUP_TAR" || ! -f "$BACKUP_TAR" ]]; then
    echo "[ERROR] Usage: ./restore.sh <path-to-backup.tar.gz>"
    exit 1
fi

TEMP_RESTORE="/tmp/cloudpanel_restore_$(date +%s)"
mkdir -p "$TEMP_RESTORE"

tar -xzf "$BACKUP_TAR" -C "$TEMP_RESTORE"

if [[ -f "$TEMP_RESTORE/db_dump.sql" ]]; then
    echo "[INFO] Restoring PostgreSQL database..."
    psql -U cloudpanel cloudpanel < "$TEMP_RESTORE/db_dump.sql" || true
fi

if [[ -f "$TEMP_RESTORE/.env" ]]; then
    cp -f "$TEMP_RESTORE/.env" /opt/cloudpanel/backend/.env
fi

rm -rf "$TEMP_RESTORE"

echo "[SUCCESS] Restore finished successfully."
