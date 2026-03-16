import express from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const u = await req.db.prepare('SELECT id, username, email, name, phone, role FROM users WHERE id = ?').bind(req.user.id).first();
    if (!u) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    res.json({ success: true, user: u });
  } catch (error) {
    console.error('본인 정보 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if ('name' in req.body) await req.db.prepare('UPDATE users SET name = ? WHERE id = ?').bind((name || '').trim() || null, req.user.id).run();
    if ('phone' in req.body) await req.db.prepare('UPDATE users SET phone = ? WHERE id = ?').bind((phone || '').trim() || null, req.user.id).run();
    res.json({ success: true, message: '저장되었습니다.' });
  } catch (error) {
    console.error('본인 이름 변경 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
    }
    const { results: users } = await req.db.prepare(`
      SELECT u.id, u.username, u.email, u.name, u.phone, u.role, u.team_leader_id, t.username as team_leader_name
      FROM users u
      LEFT JOIN users t ON u.team_leader_id = t.id
      ORDER BY u.role DESC, u.username
    `).all();
    const { results: teamLeaders } = await req.db.prepare('SELECT id, username FROM users WHERE role = ?').bind('team_leader').all();
    res.json({ success: true, users, teamLeaders });
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/:id/team-leader', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
    }
    const { id } = req.params;
    const { team_leader_id } = req.body;
    const target = await req.db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!target) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    if (team_leader_id !== null && team_leader_id !== undefined && team_leader_id !== '') {
      const tl = await req.db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').bind(team_leader_id, 'team_leader').first();
      if (!tl) return res.status(400).json({ success: false, message: '유효한 팀장을 선택해주세요.' });
    }
    await req.db.prepare('UPDATE users SET team_leader_id = ? WHERE id = ?').bind(team_leader_id || null, id).run();
    res.json({ success: true, message: '팀원 지정이 수정되었습니다.' });
  } catch (error) {
    console.error('팀원 지정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/:id/role', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
    }
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ['admin', 'team_leader', 'user'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: '유효한 역할을 선택해주세요.' });
    }
    const target = await req.db.prepare('SELECT id, role FROM users WHERE id = ?').bind(id).first();
    if (!target) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    await req.db.prepare('UPDATE users SET role = ? WHERE id = ?').bind(role, id).run();
    if (role === 'team_leader') {
      await req.db.prepare('UPDATE users SET team_leader_id = NULL WHERE id = ?').bind(id).run();
    } else if (target.role === 'team_leader') {
      await req.db.prepare('UPDATE users SET team_leader_id = NULL WHERE team_leader_id = ?').bind(id).run();
    }
    res.json({ success: true, message: '역할이 변경되었습니다.' });
  } catch (error) {
    console.error('역할 변경 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/:id/name', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
    }
    const { id } = req.params;
    const { name } = req.body;
    const target = await req.db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!target) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    await req.db.prepare('UPDATE users SET name = ? WHERE id = ?').bind((name || '').trim() || null, id).run();
    res.json({ success: true, message: '이름이 변경되었습니다.' });
  } catch (error) {
    console.error('이름 변경 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/:id/phone', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
    }
    const { id } = req.params;
    const { phone } = req.body;
    const target = await req.db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!target) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    await req.db.prepare('UPDATE users SET phone = ? WHERE id = ?').bind((phone || '').trim() || null, id).run();
    res.json({ success: true, message: '전화번호가 변경되었습니다.' });
  } catch (error) {
    console.error('전화번호 변경 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/:id/password', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자만 접근할 수 있습니다.' });
    }
    const { id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: '비밀번호는 6자 이상이어야 합니다.' });
    }
    const target = await req.db.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!target) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    const hashed = bcrypt.hashSync(password, 10);
    await req.db.prepare('UPDATE users SET password = ? WHERE id = ?').bind(hashed, id).run();
    res.json({ success: true, message: '비밀번호가 변경되었습니다.' });
  } catch (error) {
    console.error('비밀번호 변경 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
