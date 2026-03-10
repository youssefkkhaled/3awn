# Vercel Deploy Checklist

Use this for the short-term Vercel deployment.

## In The Repo

- [x] PostgreSQL runtime path
- [x] Vercel Blob upload path
- [x] optional Turnstile

## You Need To Do

1. Create or connect a PostgreSQL database for Vercel.
2. Enable Vercel Blob for the project.
3. Set these env vars in Vercel:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `IP_HASH_PEPPER`
   - `BLOB_READ_WRITE_TOKEN`
   - `DATABASE_URL` or `POSTGRES_URL`
4. Optional:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
5. Deploy.
6. Test:
   - `/`
   - `/admin/login`
   - donation submission with receipt upload

## Local Preflight

Before deploying, you can verify your env values locally:

```bash
npm run check:vercel-env
```
