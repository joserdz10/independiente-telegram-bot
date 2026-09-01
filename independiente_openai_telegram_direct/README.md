# El Independiente de Hidalgo Digital — Telegram + OpenAI directo

Sin n8n. Arquitectura:

Telegram privado -> webhook Node.js -> OpenAI Responses API + Web Search -> Telegram.

## Qué hace esta v1

- `/mesa`: busca 5 historias actuales: Local/Hidalgo, Seguridad, Política Hidalgo, Política Nacional y Deportes.
- Cada historia llega con botones `Producir`, `Otro enfoque`, `Descartar`.
- `Producir`: vuelve a verificar la noticia, genera titular + copy Facebook + hashtags y renderiza una pieza 1080x1350.
- El footer NO se genera con IA: usa `assets/footer_master.png`, el asset exacto aprobado.
- El arte v1 es text/data-first para garantizar consistencia. En la siguiente iteración se puede añadir envío de fotografía por Telegram y composición sobre esa foto.

## 1. Requisitos

- Node.js 20+
- Bot de Telegram creado con BotFather
- Clave de OpenAI API
- Un hosting HTTPS público (Render es suficiente)

## 2. Configuración local

```bash
cp .env.example .env
npm install
npm start
```

Variables:

- `TELEGRAM_BOT_TOKEN`: token de BotFather.
- `OPENAI_API_KEY`: clave de la API de OpenAI.
- `OPENAI_MODEL`: por defecto `gpt-5.5`; cámbialo si tu proyecto usa otro modelo compatible.
- `PUBLIC_BASE_URL`: URL HTTPS pública del servicio.
- `TELEGRAM_WEBHOOK_SECRET`: secreto largo propio.
- `ALLOWED_TELEGRAM_USER_ID`: tu Telegram user id, para que el bot solo responda a ti.

## 3. Despliegue en Render

1. Sube este proyecto a un repositorio privado de GitHub.
2. En Render: New -> Web Service -> conecta el repositorio.
3. Build command: `npm install`
4. Start command: `npm start`
5. Agrega todas las variables de entorno.
6. Copia la URL pública de Render a `PUBLIC_BASE_URL`.
7. Abre Shell en Render y ejecuta `npm run setup:webhook` una vez.
8. En Telegram envía `/start` y luego `/mesa`.

## Seguridad

- Nunca subas `.env` al repositorio.
- No compartas el token de Telegram ni la API key.
- Configura `ALLOWED_TELEGRAM_USER_ID` para uso privado.
- El webhook valida `X-Telegram-Bot-Api-Secret-Token`.

## Siguiente mejora recomendada

Agregar recepción de fotos en Telegram: seleccionas una noticia, mandas la fotografía real, el backend la encuadra dentro de Formato A/B/C y coloca automáticamente isotipo + footer maestro sin alterarlos.

## Railway — corrección de tipografías (v2)

Esta versión incluye `Dockerfile` para instalar `fonts-dejavu-core` y evitar cuadros vacíos/tofu en los textos generados por Sharp/libRSVG.

En Railway:
1. Root Directory: `/independiente_openai_telegram_direct_v2` si subes esta carpeta tal cual, o `/` si subes su contenido a la raíz del repo.
2. Builder: Dockerfile (si Railway lo detecta, selecciónalo).
3. Build Command: dejar vacío cuando uses Dockerfile.
4. Start Command: dejar vacío cuando uses Dockerfile; el `CMD` ya es `npm start`.
5. Mantén las mismas variables de entorno.

La imagen de Fase 3 sigue siendo text/data-first: no inventa una fotografía periodística. El isotipo y el footer son assets fijos y se insertan sin redibujarse.
