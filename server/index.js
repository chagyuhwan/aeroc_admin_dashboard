/**
 * 로컬 개발용 서버 (node:sqlite)
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

import db from './db.js';
import { wrapSqlite } from './db-adapter.js';
import { createApp } from './app.js';

const app = createApp({ db: wrapSqlite(db) });
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log(`로그인 페이지: http://localhost:${PORT}/login`);
});
