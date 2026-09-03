# El Independiente de Hidalgo Digital — Telegram + OpenAI directo v5

Versión enfocada en reproducir de forma consistente el estilo visual aprobado por el usuario: fotografía dominante relacionada con la nota, tipografía institucional, composición limpia, texto totalmente contenido, fuente discreta y footer maestro exacto.

## Cambios principales de v5

- Prompt visual final integrado en `src/brand-book.js` y `src/openai-news.js`.
- El renderer es ahora la autoridad final de encuadre: ajusta tamaño y saltos de línea para evitar que el texto se salga del lienzo.
- Formato A: sujeto/lugar/hecho específico como foco visual, composición con texto protegido a la izquierda.
- Formato B: fotografía dominante, sin collage, con caja de dato compacta.
- Formato C: cifra protagonista sin repetir el mismo valor dentro del titular.
- Tipografía institucional: Newsreader / Sora / Inter.
- Footer e isotipo siguen siendo assets fijos exactos.
- Fuente de la nota se ajusta automáticamente dentro del ancho disponible.
- `/health` reporta `version: 5.0.0` y `brand_book: 5.0-strict`.

## Horarios de mesa

- 08:00
- 12:00
- 17:00
- Zona: `America/Mexico_City`

## Sustitución en GitHub

1. Sustituye el contenido actual del repo por el contenido de este paquete.
2. Mantén el Root Directory de Railway en `/`.
3. Haz Commit en GitHub.
4. Railway deberá mostrar en Deploy Logs:

```text
independiente-telegram-openai@5.0.0 start
```

5. En Telegram prueba `/estado`, `/mesa` y una gráfica A, B y C.

## Assets maestros

- `assets/footer_master.png`
- `assets/isotipo_i.png`

No deben ser redibujados por IA.


## V5.1 - Resiliencia de conexión con Telegram

- Corrige fallos transitorios `TypeError: fetch failed` / `ETIMEDOUT` hacia `api.telegram.org`.
- Prioriza IPv4 en Node/Railway.
- Añade hasta 4 reintentos automáticos con backoff exponencial.
- Reintenta también HTTP 408/425/429/5xx y respeta `retry_after` de Telegram.
- Timeout configurable por solicitud.

Variables opcionales:
- `TELEGRAM_RETRY_ATTEMPTS=4`
- `TELEGRAM_REQUEST_TIMEOUT_MS=25000`
