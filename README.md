# AEROC Admin Dashboard

Company admin dashboard (Node.js + Express + D1/SQLite)

## Local Development

```bash
npm install
npm start
```

- Login: http://localhost:3000/login

## Cloudflare Workers Deployment

### Prerequisites

- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Cloudflare account logged in

### Deploy

```bash
npm run deploy
```

### D1 Database (First-time setup)

```bash
# Apply schema
npm run db:schema
```

### Deployed URL

After deployment, access via `https://<your-worker>.<account>.workers.dev`

## Environment Variables

- `JWT_SECRET`: JWT secret (must be set in production)
- `PORT`: Local server port (default: 3000)
