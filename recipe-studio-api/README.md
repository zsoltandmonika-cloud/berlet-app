# Léna Recept Studio API

A minimal serverless proxy for the Recept Studio. It keeps the OpenAI API key off the public GitHub Pages frontend.

## Endpoints

- `POST /recipe` — structured Hungarian recipe generation.
- `POST /refine` — modifies an existing recipe from a natural-language instruction.
- `POST /image` — creates a portrait HD food image and returns base64 JPEG.

## Required secrets

- `OPENAI_API_KEY` — OpenAI Platform project API key.
- `APP_TOKEN` — a long random personal token used between the Recept Studio browser and this Worker.

The browser stores only the Worker URL and `APP_TOKEN`; the OpenAI key stays server-side.

## Optional environment variables

- `OPENAI_TEXT_MODEL` (default: `gpt-5.6-terra`)
- `OPENAI_IMAGE_MODEL` (default: `gpt-image-2`)
- `ALLOWED_ORIGINS` comma-separated browser origins.

## Cloudflare Worker deployment sketch

1. Create a Worker project and copy `wrangler.toml.example` to `wrangler.toml`.
2. Store both secrets with Wrangler or the Cloudflare dashboard.
3. Deploy the Worker.
4. In Recept Studio, open **Studio AI kapcsolat**, paste the Worker URL and the personal APP_TOKEN.

Do not put the OpenAI API key into `app.js`, HTML, GitHub variables exposed to the browser, or localStorage.
