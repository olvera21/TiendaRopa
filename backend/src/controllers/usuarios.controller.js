const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../config/db');

async function list(_req, res) {
  const pool = await getPool();
  const result = await pool
    .request()
    .query('SELECT id, nombre, email, rol, activo, ultimo_acceso, created_at FROM usuarios ORDER BY rol, nombre');
  res.json(result.recordset);
}

async function save(req, res) {
  const { id, nombre, email, rol, activo, password } = req.body;
  const pool = await getPool();

  try {
    if (id) {
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        await pool
          .request()
          .input('nombre', sql.NVarChar, nombre)
          .input('email', sql.NVarChar, email)
          .input('rol', sql.NVarChar, rol)
          .input('activo', sql.Bit, activo ? 1 : 0)
          .input('password', sql.NVarChar, hash)
          .input('id', sql.Int, id)
          .query('UPDATE usuarios SET nombre=@nombre, email=@email, rol=@rol, activo=@activo, password=@password WHERE id=@id');
      } else {
        await pool
          .request()
          .input('nombre', sql.NVarChar, nombre)
          .input('email', sql.NVarChar, email)
          .input('rol', sql.NVarChar, rol)
          .input('activo', sql.Bit, activo ? 1 : 0)
          .input('id', sql.Int, id)
          .query('UPDATE usuarios SET nombre=@nombre, email=@email, rol=@rol, activo=@activo WHERE id=@id');
      }
      return res.json({ ok: true, msg: 'Usuario actualizado.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Ingresa una contraseña para el nuevo usuario.' });
    }
    const hash = await bcrypt.hash(password, 10);
    await pool
      .request()
      .input('nombre', sql.NVarChar, nombre)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hash)
      .input('rol', sql.NVarChar, rol)
      .input('activo', sql.Bit, activo ? 1 : 0)
      .query('INSERT INTO usuarios (nombre,email,password,rol,activo) VALUES (@nombre,@email,@password,@rol,@activo)');
    res.json({ ok: true, msg: 'Usuario creado correctamente.' });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
    }
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  const id = parseInt(req.params.id, 10);
  if (id === req.user.id) {
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo.' });
  }
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query('UPDATE usuarios SET activo=0 WHERE id=@id');
  res.json({ ok: true });
}

module.exports = { list, save, remove };
