#!/usr/bin/env sh
set -eu

if [ ! -f ".env" ]; then
  echo "No existe .env. Ejecuta primero scripts/setup.sh o crea .env."
  exit 1
fi

env_value() {
  key="$1"
  line="$(grep -E "^${key}=" .env | tail -n 1 || true)"
  printf "%s" "${line#*=}"
}

db_name="$(env_value DB_NAME)"
db_user="$(env_value DB_USER)"
db_password="$(env_value DB_PASSWORD)"
timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="backups"
backup_file="$backup_dir/finanzas-$timestamp.sql"

mkdir -p "$backup_dir"

docker compose exec -T db mariadb-dump \
  --single-transaction \
  -u "$db_user" \
  "-p$db_password" \
  "$db_name" > "$backup_file"

echo "Backup creado: $backup_file"
