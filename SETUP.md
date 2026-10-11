# Bainsla WABA Panel — setup & keys

Self-hosted WhatsApp Business API (Meta Cloud API) panel: team inbox, CRM, templates, broadcasts, drip/follow-up, bot flows, AI chatbot, pipeline, orders, widget, REST API and a super-admin panel for vendors, plans, payments and branding.

## Stack
Next.js 15 (App Router) · Prisma 6 · PostgreSQL · Tailwind 4. A background worker (broadcasts, sequences, reminders) starts inside the Next.js server process.

## Server environment (`.env.production`)
| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql://user:pass@localhost:5432/wapanel` |
| `AUTH_SECRET` | yes | Long random string — signs login sessions |
| `ENCRYPTION_KEY` | recommended | Encrypts WhatsApp tokens / AI keys at rest (falls back to `AUTH_SECRET`; never change it after tokens are saved) |
| `APP_URL` | yes | Public URL, e.g. `https://wa.example.com` (used for webhook URL, media links) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | yes | Super-admin created by `npx prisma db seed` |
| `UPLOAD_DIR` | yes | Folder for uploaded/received media |
| `WA_VERIFY_TOKEN`, `META_APP_SECRET`, `GRAPH_VERSION` | optional | Override the values saved in Admin → Platform Settings → Meta / WhatsApp app |
| `DISABLE_WORKER=1` | optional | Run a web-only replica without the background worker |

## What you need from Meta (per WhatsApp number)
1. **Meta Business account** (business.facebook.com), business verification recommended for higher limits.
2. **Meta Developer app** (developers.facebook.com) of type *Business* with the **WhatsApp** product added.
3. **WhatsApp Business Account (WABA) ID** and **Phone Number ID** — WhatsApp → API Setup.
4. **Permanent access token** — Business Settings → System Users → add a system user (Admin), assign the app + WABA, generate a token with `whatsapp_business_messaging` and `whatsapp_business_management`.
5. **App Secret** — App settings → Basic (used to verify webhook signatures).
6. **Webhook** — WhatsApp → Configuration: Callback URL `APP_URL/api/webhooks/whatsapp`, Verify token = the one set in Admin → Platform Settings (or the per-number token shown on the WhatsApp Numbers page). Subscribe to the `messages` field.
7. A **payment method** on the WABA for template (business-initiated) conversations.

Vendors paste the Phone Number ID, WABA ID and token on **WhatsApp Numbers** in their panel; the panel verifies them with Meta before saving.

## Optional keys
- **AI chatbot**: OpenAI API key (platform.openai.com) or Google Gemini key (aistudio.google.com). Set once in Admin → Platform Settings → Platform AI key, or per vendor in AI Settings.
- **Payments**: UPI ID / payee name / QR image in Admin → Platform Settings → Payment. Vendors pay and submit the UTR; admin approves in Payments.

## REST API (per vendor)
Create a key in **API & Integrations**, then call with `Authorization: Bearer <key>`:
- `POST /api/v1/messages` — `{ "to": "9198…", "text": "Hi" }`, template `{ "to", "template": "name", "language": "en", "variables": { "body": ["A","B"] } }`, media `{ "to", "type": "image", "url", "caption" }`
- `GET /api/v1/contacts?q=` · `POST /api/v1/contacts` — `{ "phone", "name", "email", "tags": [] }`
- Outgoing webhook (set in API & Integrations) receives inbound messages and status updates.

## Commands
```bash
npm ci
npx prisma db push && npx prisma db seed
npm run build && npm start
npm run lint && npm run typecheck && npm test
```
