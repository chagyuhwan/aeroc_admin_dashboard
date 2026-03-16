# AeroC Admin Dashboard

Company admin dashboard (Node.js + Express + D1/SQLite)

## Local Development

```bash
npm install
npm start
```

- Login: http://localhost:3000/login
- Default account: `admin` / `admin123`

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

# Seed admin account
npm run db:seed
```

### Deployed URL

After deployment, access via `https://<your-worker>.<account>.workers.dev`

## Environment Variables

- `JWT_SECRET`: JWT secret (must be set in production)
- `PORT`: Local server port (default: 3000)
