/**
 * Workers 호환 JSON body parser (iconv-lite/raw-body 의존성 없음)
 */
export function jsonBodyParser(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    req.body = {};
    return next();
  }
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('application/json')) {
    req.body = {};
    return next();
  }
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    try {
      req.body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
    } catch {
      req.body = {};
    }
    next();
  });
  req.on('error', next);
}
