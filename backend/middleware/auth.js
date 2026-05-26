const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'vibechef-dev-secret';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

module.exports = { requireAuth };
