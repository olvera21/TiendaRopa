const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql, getPool } = require('../config/db');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Por favor completa todos los campos.' });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('email', sql.NVarChar, email)
      .query('SELECT TOP 1 * FROM usuarios WHERE email = @email');

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ error: 'No existe una cuenta con ese correo.' });
    }
    if (!user.activo) {
      return res.status(403).json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' });
    }

    const passOk = await bcrypt.compare(password, user.password);
    if (!passOk) {
      return res.status(401).json({ error: 'Contraseña incorrecta. Intenta de nuevo.' });
    }

    await pool
      .request()
      .input('id', sql.Int, user.id)
      .query('UPDATE usuarios SET ultimo_acceso = SYSDATETIME() WHERE id = @id');

    const payload = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json({ ok: true, token, user: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al iniciar sesión.' });
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, me };
