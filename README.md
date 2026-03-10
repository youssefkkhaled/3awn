# Ramadan Charity Meals

Arabic RTL donation app built with Next.js and Tailwind. For your short-term launch, the recommended deployment path is now `Vercel + Postgres + Vercel Blob`, which avoids the local-disk limitation on Vercel while keeping the app logic intact.

## Recommended Deployment

Use:

- `Vercel` for hosting
- `PostgreSQL` for shared app data
- `Vercel Blob` for receipt screenshots and logo uploads
- optional `Cloudflare Turnstile`

The app supports:

- `DATABASE_URL` or `POSTGRES_URL` for Postgres
- `BLOB_READ_WRITE_TOKEN` for Vercel Blob

If Postgres is configured, the app uses:

- PostgreSQL for donations, settings, admin auth, sessions, adjustments, and audit logs
- Blob/object storage for uploads

## Required Environment For Vercel

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `IP_HASH_PEPPER`
- `BLOB_READ_WRITE_TOKEN`
- `DATABASE_URL` or `POSTGRES_URL`

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
npm run check:vercel-env
```

## Vercel Steps

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Add a Postgres database and make sure Vercel exposes either `POSTGRES_URL` or you manually set `DATABASE_URL`.
4. Enable Vercel Blob and make sure `BLOB_READ_WRITE_TOKEN` is available in the project env.
5. Fill the manual env vars:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `IP_HASH_PEPPER`
6. Deploy.
7. Open the Vercel URL and test `/` and `/admin/login`.

You can also follow [VERCEL_DEPLOY_CHECKLIST.md](/Users/ihessam/iftar%20app/VERCEL_DEPLOY_CHECKLIST.md).

## Other Deployment Paths

The repo still contains:

- SQLite + disk fallback for local development
- Render disk-based deployment files
- S3-compatible storage support for non-Vercel Postgres deployments

Those are secondary now. The short-term Vercel path is the main target.

## Notes

- Receipt confirmation remains trust-based: clicking `تأكيد الدفع` records a confirmed donation after receipt upload.
- Uploaded screenshots and campaign logo uploads can be stored in Vercel Blob in the recommended deployment.
- `next/font/google` still fetches `Cairo` and `Scheherazade New` during production builds.
