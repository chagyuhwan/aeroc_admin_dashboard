/**
 * Cloudflare Workers 엔트리포인트
 */
import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import express from 'express';
import cors from 'cors';
import authRoutes from './server/routes/auth.js';
import salesRoutes from './server/routes/sales.js';
import projectsRoutes from './server/routes/projects.js';
import usersRoutes from './server/routes/users.js';

const app = express();
app.use((req, res, next) => {
  req.db = env.DB;
  req.assets = env.ASSETS;
  next();
});
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/users', usersRoutes);

app.get(['/', '/index.html'], (req, res) => {
  res.redirect(302, '/login/');
});

app.get(['/login', '/login/', '/login.html'], async (req, res) => {
  const url = new URL('/login/index.html', req.protocol + '://' + req.get('host'));
  const r = await env.ASSETS.fetch(new Request(url.toString()));
  const buf = Buffer.from(await r.arrayBuffer());
  res.status(r.status).set(Object.fromEntries(r.headers)).send(buf);
});

app.get(['/dashboard', '/dashboard/', '/dashboard.html'], async (req, res) => {
  const url = new URL('/dashboard.html', req.protocol + '://' + req.get('host'));
  const r = await env.ASSETS.fetch(new Request(url.toString()));
  const buf = Buffer.from(await r.arrayBuffer());
  res.status(r.status).set(Object.fromEntries(r.headers)).send(buf);
});

app.get('*', async (req, res) => {
  if (env.ASSETS) {
    const url = new URL(req.url, req.protocol + '://' + req.get('host'));
    const assetRes = await env.ASSETS.fetch(new Request(url.toString()));
    const buf = Buffer.from(await assetRes.arrayBuffer());
    res.status(assetRes.status).set(Object.fromEntries(assetRes.headers)).send(buf);
  }
});

app.listen(3000);
export default httpServerHandler({ port: 3000 });
