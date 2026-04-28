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
import contractsRoutes from './server/routes/contracts.js';
import passwordsRoutes from './server/routes/passwords.js';
import vacationsRoutes from './server/routes/vacations.js';
import attendanceRoutes from './server/routes/attendance.js';
import schedulesRoutes from './server/routes/schedules.js';
import customersRoutes from './server/routes/customers.js';
import attachmentsRoutes from './server/routes/attachments.js';
import outsourcingRoutes from './server/routes/outsourcing.js';
import workreportRoutes from './server/routes/workreport.js';

const app = express();
app.use((req, res, next) => {
  req.db = env.DB;
  req.assets = env.ASSETS;
  req.r2 = env.R2;
  next();
});
app.use(cors());
app.use(express.json({ limit: '30mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/passwords', passwordsRoutes);
app.use('/api/vacations', vacationsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/attachments', attachmentsRoutes);
app.use('/api/outsourcing', outsourcingRoutes);
app.use('/api/workreport', workreportRoutes);

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

app.get(['/favicon.ico', '/favicon.png'], async (req, res) => {
  try {
    const path = req.path === '/favicon.ico' ? '/favicon.png' : '/favicon.png';
    const url = new URL(path, req.protocol + '://' + req.get('host'));
    const r = await env.ASSETS.fetch(new Request(url.toString()));
    if (!r.ok) {
      res.status(404).end();
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.status(200).set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    }).send(buf);
  } catch (e) {
    res.status(500).end();
  }
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
