#!/usr/bin/env sh
set -eu

if [ $# -ne 1 ]; then
  echo "Uso: scripts/restore.sh backups/finanzas-YYYYMMDD-HHMMSS.sql"
  exit 1
fi

backup_file="$1"
if [ ! -f "$backup_file" ]; then
  echo "No existe el archivo: $backup_file"
  exit 1
fi

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

printf "Esto reemplazara datos en la base '%s'. Escribe RESTAURAR para continuar: " "$db_name"
read -r confirm
if [ "$confirm" != "RESTAURAR" ]; then
  echo "Restauracion cancelada."
  exit 0
fi

docker compose exec -T db mariadb \
  -u "$db_user" \
  "-p$db_password" \
  "$db_name" < "$backup_file"

echo "Backup restaurado: $backup_file"
