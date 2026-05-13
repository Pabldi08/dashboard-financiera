# dashboard financiera

Aplicacion self-hosted para controlar finanzas personales desde navegador. Incluye dashboard, alta manual de movimientos, importacion CSV/Excel, exportacion a Excel, integracion n8n y bot de Telegram opcional.

## Instalacion rapida con Docker

```bash
git clone URL_DEL_REPOSITORIO dashboard-financiera
cd dashboard-financiera
cp .env.example .env
nano .env
docker compose up -d --build
```

Abre:

```text
http://IP_DEL_SERVIDOR:8000/
```

Credenciales iniciales: las que pongas en `.env`:

```env
APP_ADMIN_USER=admin
APP_ADMIN_PASSWORD=cambia_esta_password
```

Docker Compose arranca:

- `dashboard-financiera`: app FastAPI + frontend.
- `dashboard-financiera-db`: MariaDB con volumen persistente.
- `dashboard-financiera-telegram`: worker opcional para Telegram.

Los datos de MariaDB viven en el volumen Docker `mariadb-data`.

## Configuracion

Variables principales de `.env`:

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

Para usar una MariaDB externa, cambia `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`. Ese usuario necesita permisos de lectura, escritura y migracion sobre la base de datos.

Permisos recomendados para una MariaDB externa:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER ON finanzas.* TO 'dashboard_app'@'%';
FLUSH PRIVILEGES;
```

La app necesita `CREATE` y `ALTER` para crear o actualizar tablas como `banks`, `import_jobs` y `telegram_messages`.

## Funciones

- Login simple para una cuenta por instalacion.
- Dashboard mensual con gasto, ingresos, balance, media diaria y gasto anual.
- Graficos por categoria y periodo.
- Filtros por fecha, categoria y tipo.
- Alta, edicion y borrado de movimientos desde la web.
- Gestion de bancos/cuentas con nombre y logo.
- Selector horizontal deslizable de banco al crear o editar movimientos.
- Importacion CSV/Excel con previsualizacion.
- Exportacion a Excel de los movimientos filtrados.
- Endpoint n8n protegido con API key.
- Worker Telegram por polling, sin exponer la app publicamente.
- Modo oscuro/claro.

## API principal

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/summary/month`
- `GET /api/insights/month`
- `GET /api/movements`
- `POST /api/movements`
- `PUT /api/movements/{id}`
- `DELETE /api/movements/{id}`
- `GET /api/banks`
- `POST /api/banks`
- `PUT /api/banks/{id}`
- `DELETE /api/banks/{id}`
- `POST /api/imports/preview`
- `POST /api/imports/commit`
- `GET /api/export/movements.xlsx`
- `POST /api/integrations/n8n/movements`

La documentacion interactiva esta en:

```text
http://IP_DEL_SERVIDOR:8000/docs
```

## Formato de movimiento

Ejemplo JSON:

```json
{
  "tipo": "gasto",
  "cantidad": 12.5,
  "moneda": "EUR",
  "categoria": "comida",
  "subcategoria": "restaurante",
  "concepto": "Menu diario",
  "metodo_pago": "tarjeta",
  "cuenta": "principal",
  "nota": "",
  "created_at": "2026-05-13T14:30:00"
}
```

El campo `cuenta` guarda el banco seleccionado. La pantalla de bancos permite registrar nombre y `logo_url`, y el selector de movimientos muestra esos bancos en una banda horizontal deslizable.

## Bancos

Ejemplo JSON:

```json
{
  "name": "BBVA",
  "logo_url": "https://...",
  "is_active": true
}
```

Al borrar un banco desde la app se oculta del selector, pero no se modifican los movimientos antiguos que ya lo usaban.

## Integracion con n8n

Endpoint:

```text
POST /api/integrations/n8n/movements
```

Cabecera obligatoria:

```text
X-API-Key: valor_de_INTEGRATION_API_KEY
```

Body: el mismo formato JSON de movimiento.

## Telegram

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

El worker usa polling, asi que no necesitas abrir la app a Internet.

## Importacion CSV/Excel

Desde el dashboard puedes subir `.csv`, `.xlsx` o `.xls`.

Columnas reconocidas:

- `fecha` o `created_at`
- `tipo`
- `cantidad` o `importe`
- `moneda`
- `categoria`
- `subcategoria`
- `concepto` o `descripcion`
- `metodo_pago` o `metodo de pago`
- `cuenta`
- `nota`

La app previsualiza filas validas antes de importarlas.

## Desarrollo local sin Docker

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Actualizar una instalacion systemd existente

Si usas la instalacion manual de Raspberry:

```bash
cd /home/pablo/dashboard-financiera
.venv/bin/pip install -r requirements.txt
sudo systemctl restart dashboard-financiera
sudo systemctl status dashboard-financiera
```

Recuerda copiar los archivos nuevos antes de reiniciar.

## Seguridad

- No subas `.env` a Git.
- Cambia `APP_ADMIN_PASSWORD`, `APP_SECRET_KEY`, `INTEGRATION_API_KEY` y passwords de MariaDB.
- No abras el puerto `8000` al publico sin HTTPS y una configuracion de seguridad revisada.
- Para uso domestico, red local o Tailscale es lo recomendado.

El icono de Microsoft Excel usado en el boton de exportacion se guarda localmente en `app/static/vendor/microsoft-excel.svg` y procede de SVGL.
