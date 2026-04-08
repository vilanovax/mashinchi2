#!/bin/bash
# Mashinchi Database Restore
# Usage: ./scripts/restore.sh <backup-file.sql>

CONTAINER="mashinchi-db"
DB_NAME="mashinchi2"
DB_USER="mashinchi"
INPUT="$1"

if [ -z "$INPUT" ]; then
  echo "Usage: ./scripts/restore.sh <backup-file.sql>"
  echo ""
  echo "Available backups:"
  ls -lh backups/*.sql 2>/dev/null || echo "  No backups found in backups/"
  exit 1
fi

if [ ! -f "$INPUT" ]; then
  echo "ERROR: File not found: $INPUT"
  exit 1
fi

# Check container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Container '$CONTAINER' is not running. Start it first:"
  echo "  docker compose up -d"
  exit 1
fi

SIZE=$(du -sh "$INPUT" | cut -f1)
echo "Restoring database from: $INPUT ($SIZE)"
echo "Container: $CONTAINER"
echo "Database: $DB_NAME"
echo ""
read -p "This will OVERWRITE the current database. Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

cat "$INPUT" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" 2>&1 | tail -5

if [ $? -eq 0 ]; then
  echo ""
  echo "Restore complete!"
  echo ""
  echo "Next steps:"
  echo "  npx prisma generate"
  echo "  npm run dev"
else
  echo "ERROR: Restore failed"
  exit 1
fi
