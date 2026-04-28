/**
 * Express 앱 팩토리 - DB를 주입받아 앱 생성
 * 로컬: node:sqlite, Cloudflare: D1
 * @param {object} options - { db, assets? } assets는 Cloudflare Workers용
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import salesRoutes from './routes/sales.js';
import projectsRoutes from './routes/projects.js';
import usersRoutes from './routes/users.js';
import contractsRoutes from './routes/contracts.js';
import passwordsRoutes from './routes/passwords.js';
import customersRoutes from './routes/customers.js';
import vacationsRoutes from './routes/vacations.js';
import attendanceRoutes from './routes/attendance.js';
import schedulesRoutes from './routes/schedules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(options) {
  const db = options.db || options;
  const assets = options.assets;
  const app = express();

  app.use((req, res, next) => {
    req.db = db;
    req.assets = assets;
    next();
  });

  app.use(cors());
  app.use(express.json({ limit: '30mb' }));

  if (!assets) {
    app.use(express.static(path.join(__dirname, '..')));
  }

  app.use('/api/auth', authRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/contracts', contractsRoutes);
  app.use('/api/passwords', passwordsRoutes);
  app.use('/api/customers', customersRoutes);
  app.use('/api/vacations', vacationsRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/schedules', schedulesRoutes);

  app.get(['/login', '/login/', '/login.html'], async (req, res) => {
    if (assets) {
      const url = new URL('/login/index.html', req.protocol + '://' + req.get('host'));
      const r = await req.assets.fetch(new Request(url.toString()));
      const buf = Buffer.from(await r.arrayBuffer());
      res.status(r.status).set(Object.fromEntries(r.headers)).send(buf);
      return;
    }
    res.sendFile(path.join(__dirname, '..', 'login', 'index.html'));
  });

  app.get(['/dashboard', '/dashboard/', '/dashboard.html'], async (req, res) => {
    if (assets) {
      const url = new URL('/dashboard.html', req.protocol + '://' + req.get('host'));
      const r = await req.assets.fetch(new Request(url.toString()));
      const buf = Buffer.from(await r.arrayBuffer());
      res.status(r.status).set(Object.fromEntries(r.headers)).send(buf);
      return;
    }
    res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
  });

  if (assets) {
    app.get('*', async (req, res) => {
      const url = new URL(req.url, req.protocol + '://' + req.get('host'));
      const assetRes = await req.assets.fetch(new Request(url.toString()));
      const buf = Buffer.from(await assetRes.arrayBuffer());
      res.status(assetRes.status).set(Object.fromEntries(assetRes.headers)).send(buf);
    });
  }

  return app;
}
