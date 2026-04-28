import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'admin.db'));

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
try { db.exec(`ALTER TABLE users ADD COLUMN plain_password TEXT`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }

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
try { db.exec(`ALTER TABLE projects ADD COLUMN server_period INTEGER DEFAULT 0`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }

// passwords 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS passwords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL,
    service_url TEXT,
    category TEXT DEFAULT '업무용',
    username TEXT,
    password TEXT,
    icon_color TEXT DEFAULT '#6366f1',
    icon_image TEXT,
    notes TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
try { db.exec(`ALTER TABLE passwords ADD COLUMN icon_image TEXT`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }
try { db.exec(`ALTER TABLE passwords ADD COLUMN is_public INTEGER DEFAULT 0`); } catch (e) { if (!e.message.includes('duplicate column')) throw e; }

// vacations 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS vacations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INTEGER NOT NULL DEFAULT 1,
    reason TEXT,
    status TEXT DEFAULT '대기' CHECK(status IN ('대기','승인','반려')),
    approved_by INTEGER,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
  )
`);

// vacation_quota 테이블 (연간 휴가 일수 설정)
db.exec(`
  CREATE TABLE IF NOT EXISTS vacation_quota (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    total_days INTEGER DEFAULT 12,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// customers 테이블
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    code TEXT,
    name TEXT NOT NULL,
    division TEXT,
    manager TEXT,
    phone TEXT,
    email TEXT,
    team TEXT,
    client_status TEXT DEFAULT '현재',
    memo TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
// 기존 customers 테이블에 컬럼 추가 (마이그레이션)
['category TEXT','code TEXT','division TEXT','manager TEXT','team TEXT','client_status TEXT DEFAULT \'현재\'','representative TEXT','address TEXT'].forEach(col => {
  try { db.exec(`ALTER TABLE customers ADD COLUMN ${col}`); } catch(e) { if (!e.message?.includes('duplicate column')) {} }
});

// schedules 테이블 (월간 일정표)
db.exec(`
  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    end_date TEXT,
    color TEXT DEFAULT '#3b82f6',
    memo TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// work_reports 테이블 (업무보고서)
db.exec(`
  CREATE TABLE IF NOT EXISTS work_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    call_time TEXT,
    call_count INTEGER DEFAULT 0,
    materials TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
  )
`);
try { db.exec(`ALTER TABLE work_reports ADD COLUMN call_time TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE work_reports ADD COLUMN call_count INTEGER DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE work_reports ADD COLUMN materials TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE work_reports ADD COLUMN attachment_key TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE work_reports ADD COLUMN attachment_name TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE work_reports ADD COLUMN attachment_mime TEXT`); } catch(e) {}

// outsourcing 테이블 (외주관리)
db.exec(`
  CREATE TABLE IF NOT EXISTS outsourcing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    outsource_type TEXT NOT NULL,
    representative TEXT,
    phone TEXT,
    manager TEXT,
    price INTEGER DEFAULT 0,
    status TEXT DEFAULT '진행중',
    start_date DATE,
    due_date DATE,
    memo TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
try { db.exec(`ALTER TABLE outsourcing ADD COLUMN representative TEXT`); } catch(e) { if (!e.message?.includes('duplicate column')) {} }
try { db.exec(`ALTER TABLE outsourcing ADD COLUMN phone TEXT`); } catch(e) { if (!e.message?.includes('duplicate column')) {} }

// attendance 테이블 (출근기록부)
db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date TEXT NOT NULL,
    check_in TEXT,
    check_out TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
  )
`);

export default db;
