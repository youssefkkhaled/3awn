# Render Deploy Checklist

Use this for a fresh production deployment.

## In The Repo

- [x] [render.yaml](/Users/ihessam/iftar%20app/render.yaml)
- [x] [.env.example](/Users/ihessam/iftar%20app/.env.example)
- [x] Render-safe Postgres and S3 runtime paths

## You Need To Do

1. Push this repo to GitHub or GitLab.
2. Create an S3-compatible bucket.
3. Prepare these bucket values:
   - `S3_BUCKET`
   - `S3_REGION`
   - `S3_ENDPOINT` if needed
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_PUBLIC_BASE_URL`
4. Create Cloudflare Turnstile keys:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
5. Pick your admin credentials:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
6. Generate secrets:
   - `SESSION_SECRET`
   - `IP_HASH_PEPPER`
7. In Render, create from Blueprint using [render.yaml](/Users/ihessam/iftar%20app/render.yaml).
8. After Render creates the web service and database, fill the missing env vars in the Render dashboard.
9. Redeploy once after setting all secrets.
10. Test:
   - `/`
   - `/admin/login`
   - donation submission with receipt upload

## Local Preflight

Before deploying, you can verify your env values locally:

```bash
npm run check:render-env
```
