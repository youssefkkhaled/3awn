# Render Deploy Checklist

Use this for the simple Render deployment.

## In The Repo

- [x] [render.yaml](/Users/ihessam/iftar%20app/render.yaml)
- [x] [.env.example](/Users/ihessam/iftar%20app/.env.example)
- [x] single-service Render runtime
- [x] persistent disk storage for database and uploads

## You Need To Do

1. Push this repo to GitHub or GitLab.
2. Choose your admin login:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
3. Generate:
   - `SESSION_SECRET`
   - `IP_HASH_PEPPER`
4. In Render, create from Blueprint using [render.yaml](/Users/ihessam/iftar%20app/render.yaml).
5. Fill the missing env vars in the Render dashboard:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `IP_HASH_PEPPER`
6. Optional: add Turnstile keys if you want bot protection:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
7. Redeploy.
8. Test:
   - `/`
   - `/admin/login`
   - donation submission with receipt upload

## Local Preflight

Before deploying, you can verify your env values locally:

```bash
npm run check:render-env
```
