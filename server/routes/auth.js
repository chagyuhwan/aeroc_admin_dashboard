import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'aeroc-admin-secret-key-change-in-production';

router.post('/register', async (req, res) => {
  try {
    const { name, username, password, email, phone } = req.body;
    const db = req.db;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ success: false, message: '이름, 아이디, 비밀번호, 이메일을 입력해주세요.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: '올바른 이메일 형식을 입력해주세요.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '비밀번호는 6자 이상이어야 합니다.' });
    }

    const existingUser = await db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').bind(username, email).first();
    if (existingUser) {
      return res.status(409).json({ success: false, message: '이미 사용 중인 아이디 또는 이메일입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.prepare('INSERT INTO users (username, email, password, name, phone) VALUES (?, ?, ?, ?, ?)').bind(
      username,
      email,
      hashedPassword,
      (name || '').trim() || null,
      (phone || '').trim() || null
    ).run();

    res.status(201).json({ success: true, message: '회원가입이 완료되었습니다.' });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = req.db;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });
    }

    const user = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
    if (!user) {
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const role = user.role || 'user';

    const token = jwt.sign(
      { id: user.id, username: user.username, role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '로그인 성공',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name || null,
        phone: user.phone || null,
        role
      }
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
