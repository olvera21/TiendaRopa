const jwt = require('jsonwebtoken');

/** Verifica el JWT enviado en el header Authorization: Bearer <token> */
function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autenticado. Inicia sesión de nuevo.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, nombre, email, rol }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión expirada o inválida. Inicia sesión de nuevo.' });
  }
}

module.exports = { requireLogin };
