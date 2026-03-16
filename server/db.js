import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'data', 'admin.db'));

// users 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// role 컬럼 추가 (기존 DB 마이그레이션)
try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);
} catch (e) {
  if (!e.message.includes('duplicate column')) throw e;
}
try { db.exec(`ALTER TABLE users ADD COLUMN team_leader_id INTEGER REFERENCES users(id)`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }
try { db.exec(`ALTER TABLE users ADD COLUMN name TEXT`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }
try { db.exec(`ALTER TABLE users ADD COLUMN phone TEXT`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }

// sales 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    sale_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// projects 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    manager TEXT NOT NULL,
    project_type TEXT NOT NULL,
    contract_period INTEGER NOT NULL,
    status TEXT DEFAULT '진행중',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`);

try { db.exec(`ALTER TABLE projects ADD COLUMN status TEXT DEFAULT '진행중'`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }
try { db.exec(`ALTER TABLE projects ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }
try { db.exec(`ALTER TABLE projects ADD COLUMN price INTEGER DEFAULT 0`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }
try { db.exec(`ALTER TABLE projects ADD COLUMN representative_name TEXT`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }
try { db.exec(`ALTER TABLE projects ADD COLUMN representative_phone TEXT`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }
try { db.exec(`ALTER TABLE projects ADD COLUMN is_urgent INTEGER DEFAULT 0`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }
try { db.exec(`ALTER TABLE projects ADD COLUMN memo TEXT`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }
try { db.exec(`ALTER TABLE projects ADD COLUMN developer TEXT`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }
try { db.exec(`ALTER TABLE projects ADD COLUMN website_url TEXT`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }

export default db;
