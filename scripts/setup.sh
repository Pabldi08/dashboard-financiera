#!/usr/bin/env sh
set -eu

if [ -f ".env" ] && [ "${1:-}" != "--force" ]; then
  echo ".env ya existe. Usa scripts/setup.sh --force para regenerarlo."
  exit 0
fi

secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    od -An -N32 -tx1 /dev/urandom | tr -d " \n"
  fi
}

prompt_default() {
  label="$1"
  default="$2"
  printf "%s [%s]: " "$label" "$default" >&2
  read -r value
  if [ -z "$value" ]; then
    value="$default"
  fi
  printf "%s" "$value"
}

admin_user="$(prompt_default "Usuario admin" "admin")"
printf "\nPassword admin: "
stty -echo 2>/dev/null || true
read -r admin_password
stty echo 2>/dev/null || true
printf "\n"
if [ -z "$admin_password" ]; then
  admin_password="$(secret)"
  echo "Password admin generado automaticamente."
fi
app_port="$(prompt_default "Puerto de la app" "8000")"
printf "\n"

cat > .env <<EOF
APP_NAME=dashboard-financiera
APP_PORT=$app_port
APP_ADMIN_USER=$admin_user
APP_ADMIN_PASSWORD=$admin_password
APP_SECRET_KEY=$(secret)
INTEGRATION_API_KEY=$(secret)
TELEGRAM_BOT_TOKEN=

DB_HOST=db
DB_PORT=3306
DB_NAME=finanzas
DB_USER=dashboard
DB_PASSWORD=$(secret)
MARIADB_ROOT_PASSWORD=$(secret)
EOF

echo ".env creado."
echo "Arranca la app con: docker compose up -d --build"
