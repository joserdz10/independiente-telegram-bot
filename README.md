# El Independiente de Hidalgo Digital — Telegram + OpenAI directo v4.3

Arquitectura: Telegram -> webhook Node.js en Railway -> OpenAI Responses API + Web Search -> mesa editorial -> aprobación -> GPT Image (solo fondo visual) -> renderer rígido del Brand Book -> Telegram.

## Qué cambia en v4.3

- Integra tu feedback operativo sobre las **opciones A, B y C**.
- **Opción / Formato A** ahora obliga al bot a priorizar un fondo visual directamente relacionado con la nota: persona, lugar o hecho específico, evitando escenas genéricas cuando el sujeto está claro.
- **Opción / Formato B** mantiene fotografía dominante, pero con reglas más estrictas para evitar saturación y desbordes de texto.
- **Opción / Formato C** ahora prohíbe la repetición innecesaria del mismo dato entre titular, cifra y etiqueta secundaria.
- Se refuerza la instrucción de usar la **tipografía institucional del manual**.
- Se endurece la regla de que el texto debe quedar **encuadrado dentro del lienzo**.
- El renderer ahora ajusta mejor cifras y cajas de dato para que no se salgan del post.
- `/health` reporta `version: 4.3.0` y `brand_book: 4.3-strict`.

## Reglas visuales integradas

### Formato A
- Imagen visual directamente relacionada con la nota.
- Si habla de una persona, el visual debe corresponder a esa persona.
- Si habla de un lugar, el visual debe corresponder a ese lugar o entorno reconocible.
- Evitar fondos genéricos.
- Una sola escena.
- Texto completamente dentro del lienzo.

### Formato B
- Fotografía/escena dominante.
- Sin collage.
- Sin saturación.
- Titular y bajada compactos.
- Cajas de dato ajustadas para no salirse.

### Formato C
- Cifra protagonista.
- El texto secundario debe complementar, no repetir.
- Diseño limpio y sintético.
- Caja de cifra y tipografía con ajuste automático.

## Variables Railway

Obligatorias:
- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY`
- `PUBLIC_BASE_URL`
- `TELEGRAM_WEBHOOK_SECRET`

Recomendadas:
- `ADMIN_TELEGRAM_USER_ID`
- `EDITORIAL_CHAT_ID`
- `OPENAI_MODEL=gpt-5.6-sol`
- `OPENAI_IMAGE_MODEL=gpt-image-2`
- `OPENAI_IMAGE_QUALITY=medium`
- `ENABLE_AI_VISUALS=true`
- `MESA_CRON=0 8,12,17 * * *`
- `MESA_TIMEZONE=America/Mexico_City`

## Operación

- `/start` — registra el chat editorial y muestra ayuda.
- `/estado` — confirma si este chat tiene controles de producción activos.
- `/mesa` — mesa manual.
- `🎨 Generar gráfica` — produce la nota aprobada bajo el Brand Book.
- `/grafica 1,3` — produce varias de la mesa más reciente.
- `♻️ Otro enfoque` — reformula el ángulo sin alterar hechos.
- `❌ Descartar` — descarta.

## Sustitución en tu repo

1. Borra o reemplaza el contenido actual del repo por el contenido de este paquete.
2. Conserva `assets/footer_master.png` e `assets/isotipo_i.png` de esta versión.
3. Haz commit en GitHub.
4. Railway redeployará automáticamente.
5. Prueba `/mesa` y luego `🎨 Generar gráfica` en una nota de cada formato.
