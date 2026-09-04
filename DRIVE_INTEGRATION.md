# Google Drive — flujo de aprobación

## Flujo del bot
1. Mesa editorial -> `🎨 Generar gráfica`.
2. El bot entrega arte + copy.
3. Debajo aparece `✅ Aprobar y enviar a Drive`.
4. Al aprobar, la pieza queda disponible para la persona encargada de publicar.

## Estructura automática
`AÑO / MES / DÍA / CATEGORÍA / HHMM_TITULAR /`

Cada publicación contiene:
- `arte.png`
- `copy_redes.txt`
- `metadata.json`

Comparte únicamente la carpeta raíz de Drive con la persona que publicará. Todas las subcarpetas heredarán el acceso.

## Variables en Railway
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REFRESH_TOKEN`

El bot usa OAuth del propietario del Drive, por lo que los archivos se crean directamente en ese Drive.

## Verificación
- `/estado` debe mostrar `Google Drive: ✅ CONFIGURADO`.
- `/health` debe devolver `drive: true`.
