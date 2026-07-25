const { puedeVer } = require('../utils/helpers');

/**
 * requirePermiso('gastos') -> solo deja pasar si el rol del usuario
 * autenticado tiene acceso a ese módulo (o es admin).
 * Debe usarse siempre DESPUÉS de requireLogin.
 */
function requirePermiso(modulo) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!puedeVer(req.user.rol, modulo)) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a esta sección.' });
    }
    next();
  };
}

/** Solo administradores (ej. módulo de usuarios) */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo un administrador puede realizar esta acción.' });
  }
  next();
}

module.exports = { requirePermiso, requireAdmin };
