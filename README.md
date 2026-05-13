# dashboard financiera

Aplicacion web local para consultar movimientos financieros desde MariaDB.

## Fase 2: entorno de desarrollo

1. Crear y activar el entorno virtual:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Instalar dependencias:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

3. Crear la configuracion local:

```powershell
Copy-Item .env.example .env
```

Edita `.env` con los datos reales de tu MariaDB cuando pasemos a la Fase 3.

4. Arrancar la app de desarrollo:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

5. Probar en el navegador:

- http://127.0.0.1:8000/api/health
- http://127.0.0.1:8000/docs

## Fase 3: conexion a MariaDB

La configuracion real vive en `.env`. Ese archivo no se sube a Git.

Edita estos valores:

```env
DB_HOST=IP_DE_TU_RASPBERRY
DB_PORT=3306
DB_NAME=finanzas
DB_USER=gastos_readonly
DB_PASSWORD=tu_password_real
```

Para probar la conexion desde la app:

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Luego abre:

- http://127.0.0.1:8000/api/db-health

El usuario recomendado para esta primera version debe tener solo permisos `SELECT`.

## Fase 4: endpoints del backend

Endpoints disponibles:

- `GET /api/summary/month`
- `GET /api/movements/recent`
- `GET /api/movements`
- `GET /api/expenses/by-category`
- `GET /api/expenses/by-period`
- `GET /api/categories`
- `GET /api/types`

Ejemplos:

```text
http://127.0.0.1:8000/api/summary/month
http://127.0.0.1:8000/api/summary/month?year=2026&month=5
http://127.0.0.1:8000/api/movements/recent?limit=10
http://127.0.0.1:8000/api/movements?start_date=2026-05-01&end_date=2026-05-31
http://127.0.0.1:8000/api/movements?type=gasto&category=comida
http://127.0.0.1:8000/api/expenses/by-category?start_date=2026-05-01
http://127.0.0.1:8000/api/expenses/by-period?period=day
http://127.0.0.1:8000/api/expenses/by-period?period=month
```

Los filtros usan estos parametros:

- `start_date`: fecha inicial, formato `YYYY-MM-DD`.
- `end_date`: fecha final, formato `YYYY-MM-DD`.
- `category`: categoria exacta.
- `type`: tipo exacto, por ejemplo `gasto` o `ingreso`.
- `limit`: numero maximo de movimientos.
- `offset`: salto para paginacion.

## Fase 5: frontend

La interfaz visual esta en:

```text
http://127.0.0.1:8000/
```

Incluye:

- tarjetas de resumen mensual,
- filtros por fecha, categoria y tipo,
- grafico de gastos por categoria,
- grafico de gastos por dia o por mes,
- tabla de movimientos.

Chart.js se sirve desde `app/static/vendor/chart.umd.min.js`, asi que la pagina no depende del CDN para pintar graficos.

El dashboard arranca en modo oscuro por defecto. El boton de la cabecera permite cambiar entre modo oscuro y claro, y la preferencia queda guardada en el navegador.

## Fase 6: probar desde el PC

Arranca la aplicacion:

```powershell
cd "C:\Users\diazr\Documents\New project\dashboard-financiera"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Abre:

```text
http://127.0.0.1:8000/
```

Comprobaciones recomendadas:

1. La cabecera debe mostrar `Conectado`.
2. Las tarjetas deben mostrar el gasto del mes, ingresos, balance y numero de movimientos.
3. El grafico de categorias debe mostrar los gastos agrupados por `categoria`.
4. El grafico temporal debe cambiar entre `Por dia` y `Por mes`.
5. La tabla debe mostrar los movimientos filtrados.
6. Cambia fechas, categoria o tipo y pulsa `Aplicar`.
7. Pulsa `Limpiar` para volver al mes actual.
8. Cambia entre modo oscuro y claro desde la cabecera.

Tambien puedes revisar la API en:

```text
http://127.0.0.1:8000/docs
```

## Fase 7: desplegar en Raspberry Pi con systemd

La Raspberry ejecutara la app como servicio. La primera version queda accesible solo desde red local o Tailscale si no abres puertos en el router.

### 1. Copiar el proyecto a la Raspberry

Desde PowerShell en tu PC:

```powershell
cd "C:\Users\diazr\Documents\New project\dashboard-financiera"
ssh pi@IP_DE_TU_RASPBERRY "mkdir -p /home/pi/dashboard-financiera"
scp -r app systemd requirements.txt .env.example pi@IP_DE_TU_RASPBERRY:/home/pi/dashboard-financiera
```

Si usas Tailscale, puedes poner la IP Tailscale de la Raspberry.

### 2. Preparar Python en la Raspberry

Entra por SSH:

```bash
ssh pi@IP_DE_TU_RASPBERRY
cd /home/pi/dashboard-financiera
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements.txt
```

### 3. Crear el archivo `.env` de produccion

```bash
cp .env.example .env
nano .env
```

Como MariaDB esta en la misma Raspberry, puedes usar:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=finanzas
DB_USER=gastos_readonly
DB_PASSWORD=tu_password_real
```

### 4. Probar manualmente antes de systemd

```bash
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Desde tu PC abre:

```text
http://IP_DE_TU_RASPBERRY:8000/
```

Si usas Tailscale:

```text
http://IP_TAILSCALE_DE_TU_RASPBERRY:8000/
```

Para parar la prueba manual pulsa `Ctrl+C`.

### 5. Instalar el servicio systemd

Revisa primero el archivo:

```bash
nano systemd/dashboard-financiera.service
```

Si tu usuario no es `pi`, cambia:

```ini
User=pi
Group=pi
WorkingDirectory=/home/pi/dashboard-financiera
EnvironmentFile=/home/pi/dashboard-financiera/.env
ExecStart=/home/pi/dashboard-financiera/.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Despues instala y arranca:

```bash
sudo cp systemd/dashboard-financiera.service /etc/systemd/system/dashboard-financiera.service
sudo systemctl daemon-reload
sudo systemctl enable dashboard-financiera
sudo systemctl start dashboard-financiera
sudo systemctl status dashboard-financiera
```

### 6. Ver logs

```bash
journalctl -u dashboard-financiera -f
```

### 7. Seguridad inicial

- No abras el puerto `8000` en el router.
- Usa red local o Tailscale.
- Mantén el usuario MariaDB con solo permisos `SELECT`.
- No subas `.env` a Git.
