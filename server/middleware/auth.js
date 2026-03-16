import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'AEROC-admin-secret-key-change-in-production';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const row = await req.db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').bind(decoded.id).first();
    if (!row) {
      return res.status(401).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    req.user = row;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
  }
}
