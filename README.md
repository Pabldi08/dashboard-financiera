# Dashboard Financiera

Aplicacion self-hosted para controlar finanzas personales desde navegador.

La idea principal es simple: **cada persona instala su propia copia**. No hay servidor central, no hay registro global y nadie tiene que entregar sus datos financieros a otra persona. Cada instalacion tiene su MariaDB, su `.env`, su API key de n8n y sus backups.

## Instalacion rapida con Docker

Requisitos:

- Docker
- Docker Compose
- Git

### 1º Comprueba que los tienes instalados:
```bash
git --version
docker --version
docker compose version
```

### 2º Clonar el repositorio:
En linux:
```bash
git clone https://github.com/Pabldi08/dashboard-financiera.git dashboard-financiera
cd dashboard-financiera
chmod +x scripts/*.sh
./scripts/setup.sh
docker compose up -d --build
```

En Windows PowerShell:
```powershell
git clone https://github.com/Pabldi08/dashboard-financiera.git dashboard-financiera
cd dashboard-financiera
.\scripts\setup.ps1
docker compose up -d --build
```

### 3º Abre la app en:
```text
http://localhost:8000/
```

### 4º Configuración n8n + bot de telegram
Cada usuario debe configurar su propio n8n contra su propia instalacion.

Endpoint:

```text
POST http://IP_DEL_EQUIPO:8000/api/integrations/n8n/movements
```

Cabecera:

```text
X-API-Key: valor_de_INTEGRATION_API_KEY
```

Body JSON:

```json
{
  "tipo": "gasto",
  "cantidad": 12.5,
  "moneda": "EUR",
  "categoria": "comida",
  "subcategoria": "restaurante",
  "concepto": "Menu diario",
  "metodo_pago": "tarjeta",
  "cuenta": "BBVA",
  "nota": "Creado desde n8n",
  "created_at": "2026-05-14T14:30:00"
}
```

Hay una plantilla importable en:

```text
docs/n8n-movement-example.json
```

Dentro de la app, el panel **Integracion n8n** muestra la URL del endpoint, el nombre de la cabecera y un ejemplo JSON. La API key no se muestra completa en pantalla.

### 5º Actualizar una instalacion existente con docker:
```bash
cd ~/dashboard-financiera
git pull
docker compose down
docker compose up -d --build
```

El script de setup crea `.env` con:

- usuario y password admin,
- `APP_SECRET_KEY`,
- `INTEGRATION_API_KEY` para n8n,
- passwords de MariaDB,
- puerto de la app.

`.env` no debe subirse nunca al repositorio.

## Que arranca Docker Compose

- `dashboard-financiera`: FastAPI + frontend.
- `dashboard-financiera-db`: MariaDB incluida.
- `dashboard-financiera-telegram`: worker opcional para Telegram.

Los datos viven en el volumen Docker `mariadb-data`. Reiniciar Docker, la Raspberry o el PC no borra los movimientos.

## Configuracion manual

Si no quieres usar los scripts, copia `.env.example`:

```bash
cp .env.example .env
```

Variables principales:

```env
APP_PORT=8000
APP_ADMIN_USER=admin
APP_ADMIN_PASSWORD=cambia_esta_password
APP_SECRET_KEY=cambia_esta_clave_larga
INTEGRATION_API_KEY=cambia_esta_api_key
TELEGRAM_BOT_TOKEN=

DB_HOST=db
DB_PORT=3306
DB_NAME=finanzas
DB_USER=dashboard
DB_PASSWORD=cambia_esta_password_db
MARIADB_ROOT_PASSWORD=cambia_esta_password_root
```

Para usar una MariaDB externa, cambia `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`. Ese usuario necesita permisos de lectura, escritura y migracion:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER ON finanzas.* TO 'dashboard_app'@'%';
FLUSH PRIVILEGES;
```

## Funciones

- Login simple para una cuenta por instalacion.
- Dashboard mensual con gastos, ingresos, balance, media diaria y gasto anual.
- Graficos por categoria y periodo.
- Filtros por fecha, categoria y tipo.
- Alta, edicion y borrado de movimientos desde la web.
- Gestion de bancos/cuentas con selector deslizable.
- Exportacion a Excel de movimientos filtrados.
- Endpoint n8n protegido con `X-API-Key`.
- Panel de integracion n8n dentro de la app.
- Worker Telegram opcional por polling.
- Modo oscuro/claro.

## Integracion con n8n



## Backups y restauracion

Crear backup en Linux/Raspberry:

```bash
./scripts/backup.sh
```

Crear backup en Windows:

```powershell
.\scripts\backup.ps1
```

Los backups se guardan en `backups/` y no se suben a Git.

Restaurar en Linux/Raspberry:

```bash
./scripts/restore.sh backups/finanzas-YYYYMMDD-HHMMSS.sql
```

Restaurar en Windows:

```powershell
.\scripts\restore.ps1 backups\finanzas-YYYYMMDD-HHMMSS.sql
```

Para mover la instalacion a otra maquina:

1. Instala Docker en la nueva maquina.
2. Copia el proyecto.
3. Copia el `.env` si quieres mantener las mismas claves.
4. Arranca `docker compose up -d --build`.
5. Restaura el backup `.sql`.

## Telegram opcional

1. Crea un bot con BotFather.
2. Copia el token en `.env`:

```env
TELEGRAM_BOT_TOKEN=123456:token
```

3. Arranca el worker:

```bash
docker compose --profile telegram up -d --build
```

Comandos soportados:

- `/gasto 12.50 comida Menu diario`
- `/ingreso 1000 nomina Mayo`
- `/ultimo`
- `/resumen`
- `/ayuda`

El worker usa polling, asi que no necesitas exponer la app a Internet.

Documentacion interactiva:

```text
http://IP_DEL_EQUIPO:8000/docs
```

## Desarrollo local sin Docker

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Actualizar una instalacion existente

Con systemd manual en Raspberry:

```bash
cd /home/pablo/dashboard-financiera
.venv/bin/pip install -r requirements.txt
sudo systemctl restart dashboard-financiera
sudo systemctl status dashboard-financiera
```

## Seguridad recomendada

- Usa una instalacion por persona/hogar.
- No subas `.env` a Git.
- Cambia passwords y claves si crees que se han compartido.
- Usa red local o Tailscale.
- No abras el puerto `8000` a Internet sin HTTPS y una revision de seguridad.
- Haz backups antes de actualizar.

El icono de Microsoft Excel usado en el boton de exportacion se guarda localmente en `app/static/vendor/microsoft-excel.svg` y procede de SVGL.
