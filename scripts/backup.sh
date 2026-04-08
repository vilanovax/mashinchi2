#!/bin/bash
# Mashinchi Database Backup
# Usage: ./scripts/backup.sh [output-path]

CONTAINER="mashinchi-db"
DB_NAME="mashinchi2"
DB_USER="mashinchi"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT="${1:-backups/mashinchi-${TIMESTAMP}.sql}"

# Create backups dir
mkdir -p "$(dirname "$OUTPUT")"

echo "Backing up database from container: $CONTAINER"
echo "Database: $DB_NAME"
echo "Output: $OUTPUT"
echo ""

docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-privileges > "$OUTPUT"

if [ $? -eq 0 ]; then
  SIZE=$(du -sh "$OUTPUT" | cut -f1)
  echo "Backup complete: $OUTPUT ($SIZE)"
  echo ""
  echo "To restore on another machine:"
  echo "  1. Copy this file + docker-compose.yml to target"
  echo "  2. docker compose up -d"
  echo "  3. ./scripts/restore.sh $OUTPUT"
else
  echo "ERROR: Backup failed"
  exit 1
fi
