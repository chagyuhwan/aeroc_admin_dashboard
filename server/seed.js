import bcrypt from 'bcryptjs';
import db from './db.js';

export function seedAdmin() {
  const admin = db.prepare('SELECT id, role FROM users WHERE username = ?').get('admin');
  let adminId;
  if (!admin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const result = db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(
      'admin',
      'admin@aeroc.com',
      hashedPassword,
      'admin'
    );
    adminId = result.lastInsertRowid;
    console.log('admin 계정이 생성되었습니다. (비밀번호: admin123)');
  } else {
    adminId = admin.id;
    if (admin.role !== 'admin') {
      db.prepare('UPDATE users SET role = ? WHERE username = ?').run('admin', 'admin');
      console.log('admin 계정에 관리자 권한이 부여되었습니다.');
    }
  }
}
