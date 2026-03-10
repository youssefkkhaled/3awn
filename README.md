# Ramadan Charity Meals

Arabic RTL donation app built with Next.js and Tailwind. The simplest production deployment is now a single Render web service with one persistent disk. That keeps the setup small: SQLite for app data, local file storage on the Render disk for receipt screenshots and logo uploads, and optional Cloudflare Turnstile.

## Simplest Render Deployment

Use:

- one Render web service
- one Render persistent disk
- no separate database service
- no separate storage provider
- no Cloudflare account unless you want Turnstile later

The Render blueprint is already in [render.yaml](/Users/ihessam/iftar%20app/render.yaml).

## Required Environment

For the simple Render setup, set:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `IP_HASH_PEPPER`

These are set automatically by the blueprint:

- `NODE_ENV=production`
- `DATABASE_PATH=/var/data/app.db`
- `UPLOADS_DIR=/var/data/uploads`

Optional:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

If Turnstile keys are not set, the app still works and skips Turnstile verification.

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If you do not set any env file locally, the app uses:

- SQLite at `data/app.db`
- uploads under `public/uploads`
- username `seif`
- password `bob2002`

## Commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run check:render-env
```

## Render Steps

1. Push this repo to GitHub or GitLab.
2. In Render, click `New` -> `Blueprint`.
3. Connect the repo.
4. Render reads [render.yaml](/Users/ihessam/iftar%20app/render.yaml) and creates one web service with one disk.
5. Fill the manual env vars:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `IP_HASH_PEPPER`
6. Deploy.
7. Open the Render URL and test `/` and `/admin/login`.

## Advanced Mode

The repo still supports a more scalable mode using:

- `DATABASE_URL`
- `S3_*`
- optional Turnstile

That path is only needed if you later want PostgreSQL plus S3-compatible object storage.

## Notes

- Receipt confirmation remains trust-based: clicking `تأكيد الدفع` records a confirmed donation after receipt upload.
- Uploaded screenshots and admin logo uploads are served through the app from the configured uploads directory.
- `next/font/google` still fetches `Cairo` and `Scheherazade New` during production builds.
