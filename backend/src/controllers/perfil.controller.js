const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../config/db');

async function getPerfil(req, res) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, req.user.id)
    .query('SELECT id, nombre, email, rol, activo, ultimo_acceso, created_at FROM usuarios WHERE id=@id');
  res.json(result.recordset[0] || null);
}

async function updateDatos(req, res) {
  const { nombre, email } = req.body;
  if (!nombre || !email) {
    return res.status(400).json({ error: 'Nombre y correo son requeridos.' });
  }
  const pool = await getPool();

  const dup = await pool
    .request()
    .input('email', sql.NVarChar, email)
    .input('id', sql.Int, req.user.id)
    .query('SELECT id FROM usuarios WHERE email=@email AND id!=@id');
  if (dup.recordset.length) {
    return res.status(409).json({ error: 'Ese correo ya está en uso por otro usuario.' });
  }

  await pool
    .request()
    .input('nombre', sql.NVarChar, nombre)
    .input('email', sql.NVarChar, email)
    .input('id', sql.Int, req.user.id)
    .query('UPDATE usuarios SET nombre=@nombre, email=@email WHERE id=@id');

  res.json({ ok: true, msg: 'Datos actualizados correctamente.' });
}

async function updatePassword(req, res) {
  const { actual, nueva } = req.body;
  if (!actual || !nueva) {
    return res.status(400).json({ error: 'Completa ambos campos de contraseña.' });
  }
  if (nueva.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, req.user.id)
    .query('SELECT password FROM usuarios WHERE id=@id');
  const user = result.recordset[0];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  const ok = await bcrypt.compare(actual, user.password);
  if (!ok) return res.status(401).json({ error: 'La contraseña actual es incorrecta.' });

  const hash = await bcrypt.hash(nueva, 10);
  await pool
    .request()
    .input('id', sql.Int, req.user.id)
    .input('password', sql.NVarChar, hash)
    .query('UPDATE usuarios SET password=@password WHERE id=@id');

  res.json({ ok: true, msg: 'Contraseña actualizada correctamente.' });
}

module.exports = { getPerfil, updateDatos, updatePassword };
