import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'AEROC-admin-secret-key-change-in-production';

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  // Authorization 헤더 없으면 쿼리 파라미터에서도 토큰 허용 (파일 직접 열기용)
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : (req.query?.token || null);

  if (!token) {
    return res.status(401).json({ success: false, message: '인증이 필요합니다.' });
  }
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
