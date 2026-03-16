/**
 * Workers 호환 body-parser 스텁 (iconv-lite 의존성 제거)
 */
function json() {
  return (req, res, next) => {
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
  };
}

function urlencoded() {
  return (req, res, next) => {
    req.body = {};
    next();
  };
}

function raw() {
  return (req, res, next) => next();
}

function text() {
  return (req, res, next) => next();
}

module.exports = { json, urlencoded, raw, text };
