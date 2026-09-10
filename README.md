# Plus One Promo — Admin Dashboard

Separate Next.js app for managing catalog products and order requests.

## Setup

```bash
cd admin/frontend && cp .env.example .env.local && npm install && npm run dev
```

- UI: http://localhost:3003  
- API: Google Cloud Function `adminApiP1P` (set in `.env.local`)  

Do **not** run `admin/backend` locally for day-to-day use — deploy changes with:

```bash
cd admin/backend && gcloud functions deploy adminApiP1P --gen2 --runtime=nodejs20 --region=us-west1 --source=. --entry-point=adminApi --trigger-http --allow-unauthenticated --env-vars-file=.env.yaml --project=plus-one-promo --memory=512Mi --timeout=120s
```

## Auth

Passwordless email auth via **Resend**:

1. Email must be on the allowlist (seeded: `info@necti.io`, `melina@premierikon.com`)
2. Sign up / Sign in → one-time code + magic link
3. Team page → invite additional emails (Resend invite)

Sessions are Bearer tokens stored in the browser after verify.

## Features

- Product list / publish toggle / delete
- Manual product create with showcase pricing
- S&S Activewear search + import (needs credentials on API)
- Order request inbox + status workflow
- Team allowlist + invites

## Next

- Image uploads, richer pricing rules, email notifications on new requests, product edit UI, quote PDF / confirmation emails.
