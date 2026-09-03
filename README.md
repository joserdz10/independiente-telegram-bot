# El Independiente de Hidalgo Digital — Telegram + OpenAI directo v4

Arquitectura: Telegram -> webhook Node.js en Railway -> OpenAI Responses API + Web Search -> mesa editorial -> aprobación -> GPT Image (solo fondo visual) -> renderer rígido del Brand Book -> Telegram.

## Qué cambia en v4

- Integra un **Brand Book operativo estricto** en `src/brand-book.js`.
- El prompt editorial y el prompt de imagen comparten las mismas reglas de identidad.
- El renderer valida la pieza antes de exportarla.
- Formatos A/B/C ya no son solo una recomendación: tienen layouts distintos y obligatorios.
- Formato B: una sola escena/foto dominante; el validador rechaza prompts que pidan collage o mosaico.
- Formato A: personaje/escena institucional con texto a la izquierda.
- Formato C: dato/cifra dominante.
- Titular máximo 12 palabras y bajadas recortadas a longitudes editoriales seguras.
- No se renderizan fechas por defecto.
- Footer e isotipo siguen siendo assets fijos exactos; nunca los genera la IA.
- Paleta fija: verde mineral, hueso, carbón y cobre; acentos de seguridad/deportes solo cuando corresponde.
- El Dockerfile intenta instalar en Railway las tipografías oficiales **Newsreader, Sora e Inter** durante el build; si una descarga externa falla, el renderer usa fallbacks seguros para no tumbar el bot. No se incluyen archivos de fuentes en el repositorio/ZIP.
- Mesas programadas a las **08:00, 12:00 y 17:00**, zona `America/Mexico_City`.

## Reglas clave de identidad

El sistema visual es **Territorio Independiente**.

- A = personaje / política / declaración.
- B = fotografía dominante / local / servicio público / seguridad / clima / movilidad / educación.
- C = dato / cifra / comparativo / economía / resultados / deportes.
- Una sola escena.
- Sin collage en B.
- Sin fechas innecesarias.
- Sin texto, logos, footer o marcas dentro del fondo generado por IA.
- El renderer coloca categoría, titular, bajada, dato, isotipo, fuente y footer maestro.
- Salida estándar: 1080x1350.

## Variables Railway

Obligatorias:
- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY`
- `PUBLIC_BASE_URL`
- `TELEGRAM_WEBHOOK_SECRET`
- `ADMIN_TELEGRAM_USER_ID`
- `EDITORIAL_CHAT_ID`

Recomendadas:
- `OPENAI_MODEL=gpt-5.6-sol`
- `OPENAI_IMAGE_MODEL=gpt-image-2`
- `OPENAI_IMAGE_QUALITY=medium`
- `ENABLE_AI_VISUALS=true`
- `MESA_CRON=0 8,12,17 * * *`
- `MESA_TIMEZONE=America/Mexico_City`

## Operación

- `/start` — ayuda.
- `/mesa` — mesa manual.
- `🎨 Generar gráfica` — produce la nota aprobada bajo el Brand Book.
- `/grafica 1,3` — produce varias de la mesa más reciente.
- `♻️ Otro enfoque` — reformula el ángulo sin alterar hechos.
- `❌ Descartar` — descarta.

## Despliegue sobre tu bot actual

1. Sustituye los archivos actuales del repo por los de v4.
2. Conserva `assets/footer_master.png` e `assets/isotipo_i.png` de esta versión: son los assets maestros aprobados.
3. Haz commit en GitHub.
4. Railway redeployará automáticamente con Dockerfile.
5. No necesitas cambiar dominio ni webhook si sigues usando el mismo servicio.
6. Revisa `/health` y prueba `/mesa` + una sola `🎨 Generar gráfica` antes de producción masiva.

## V4.1 - Chat editorial automático

- Ya no es obligatorio escribir `EDITORIAL_CHAT_ID` manualmente para uso privado.
- Al enviar `/start` o `/mesa`, el bot registra automáticamente ese chat como la mesa editorial si no existe un administrador configurado.
- A las 08:00, 12:00 y 17:00 el bot envía en ese mismo chat la mesa completa, no solo una notificación.
- Cada nota enviada al propietario editorial incluye botones: `🎨 Generar gráfica`, `♻️ Otro enfoque` y `❌ Descartar`.
- Si a la hora programada todavía no existe un chat registrado, la mesa se genera y se guarda internamente; puede consultarse después con `/ultima`.
- Para producción con múltiples usuarios sigue siendo recomendable configurar `ADMIN_TELEGRAM_USER_ID` explícitamente.
