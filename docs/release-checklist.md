# Checklist de release self-hosted

Usa esta lista antes de publicar una version para otras personas.

## Antes de publicar

- Ejecutar `python -m compileall app`.
- Ejecutar `node --check app/static/js/dashboard.js`.
- Probar `docker compose up -d --build` desde una carpeta limpia.
- Confirmar que `.env` no aparece en `git status`.
- Confirmar que `scripts/setup.sh` o `scripts/setup.ps1` genera claves distintas.
- Confirmar que se puede crear un movimiento desde la web.
- Confirmar que n8n inserta un movimiento con `X-API-Key`.
- Confirmar que `scripts/backup.*` crea un `.sql`.
- Confirmar que `scripts/restore.*` restaura ese `.sql`.

## Notas para usuarios

- Cada usuario debe tener su propia instalacion.
- No existe servidor central ni registro global.
- Los datos viven en su MariaDB local.
- Red local o Tailscale es la opcion recomendada.
- No abrir el puerto `8000` a Internet sin HTTPS y revision de seguridad.
