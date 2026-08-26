#!/bin/bash
# ============================================================================
# FIX_MASTER: Database Backup & Recovery Script (pg_dump / pg_restore)
# Course: BCSE307L - Database Systems (SCOPE, VIT Vellore)
# ============================================================================

set -e

DB_NAME="${DB_NAME:-fix_master_db}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="./database/backups"

mkdir -p "$BACKUP_DIR"

usage() {
    echo "Usage: $0 {backup|restore <backup_file_path>}"
    echo "Examples:"
    echo "  $0 backup"
    echo "  $0 restore ./database/backups/fix_master_20260826.dump"
    exit 1
}

do_backup() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/fix_master_${TIMESTAMP}.dump"
    echo "[INFO] Initiating PostgreSQL backup for database: ${DB_NAME}..."
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -b -v -f "$BACKUP_FILE"
    echo "[SUCCESS] Backup created successfully: ${BACKUP_FILE}"
}

do_restore() {
    if [ -z "$1" ]; then
        echo "[ERROR] Please specify the backup file path to restore."
        usage
    fi
    RESTORE_FILE="$1"
    if [ ! -f "$RESTORE_FILE" ]; then
        echo "[ERROR] File not found: ${RESTORE_FILE}"
        exit 1
    fi
    echo "[INFO] Restoring database: ${DB_NAME} from ${RESTORE_FILE}..."
    pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists -v "$RESTORE_FILE"
    echo "[SUCCESS] Database restoration completed successfully."
}

case "$1" in
    backup)
        do_backup
        ;;
    restore)
        do_restore "$2"
        ;;
    *)
        usage
        ;;
esac
