# Ramadan Charity Meals

Arabic RTL donation app built with Next.js, Tailwind, PostgreSQL, and S3-compatible object storage. The app still supports local SQLite for development fallback, but a fresh production deployment should use Postgres plus object storage so it does not write donations, sessions, or receipt images to the app disk.

## Production Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL for shared app data
- S3-compatible object storage for receipt screenshots and logo uploads
- Cookie-based admin sessions
- Optional Cloudflare Turnstile
- Vitest for unit/integration tests
- Playwright specs for browser flows

## Environment

Copy [.env.example](/Users/ihessam/iftar%20app/.env.example) to `.env.local` and configure the values you need.

Render-friendly production env:

- `DATABASE_URL`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ENDPOINT` if your provider requires a custom endpoint
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_BASE_URL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `IP_HASH_PEPPER`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` if you want Turnstile enabled

Local development can still fall back to SQLite if `DATABASE_URL` is not set:

- `DATABASE_PATH`

Important:

- If `DATABASE_URL` is set, the app uses PostgreSQL for auth, donations, settings, sessions, and adjustments.
- In PostgreSQL mode, uploads require S3-compatible storage and are not written to local disk.
- `ADMIN_USERNAME` is the preferred env name. `ADMIN_EMAIL` still works as a legacy fallback.

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If you do not set any env file locally, the app uses:

- SQLite at `data/app.db`
- Username `seif`
- Password `bob2002`

## Commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Playwright specs are opt-in:

```bash
RUN_E2E=true npm run test:e2e
```

If you want Playwright to hit an already running server, set `E2E_BASE_URL`.

## Fresh Render Deployment

Deploy this as:

- one Render web service
- one Render PostgreSQL database
- one external S3-compatible bucket for uploads

Recommended upload providers:

- AWS S3
- Cloudflare R2
- Backblaze B2 S3 API
- Tigris S3 API

Steps:

1. Create a new Render PostgreSQL database.
2. Create an S3-compatible bucket and collect its bucket name, region, credentials, endpoint, and public base URL.
3. Create a Render web service from this repo.
4. Set the production env vars listed above.
5. Deploy.

The repo includes [render.yaml](/Users/ihessam/iftar%20app/render.yaml) as a starting blueprint for the Render app and database. You still need to fill the S3 and secret env vars manually.

You can also follow [RENDER_DEPLOY_CHECKLIST.md](/Users/ihessam/iftar%20app/RENDER_DEPLOY_CHECKLIST.md) and run:

```bash
npm run check:render-env
```

## What’s Included

- Public donor flow on `/`
- Shared stats API on `/api/stats`
- Donation submission API on `/api/donations`
- Admin login on `/admin/login`
- Protected dashboard on `/admin`
- Donation moderation on `/admin/donations`
- Manual corrections on `/admin/adjustments`
- Campaign and payment settings on `/admin/settings`

## Notes

- A fresh Render deployment does not require any migration from the previous local SQLite file or local uploads.
- Receipt confirmation remains trust-based: clicking `تأكيد الدفع` records a confirmed donation after receipt upload and Turnstile verification or development bypass.
- `next/font/google` still fetches `Cairo` and `Scheherazade New` during production builds.
