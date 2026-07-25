const { sql, getPool } = require('../config/db');

async function list(req, res) {
  const buscar = (req.query.q || '').trim();
  const filtro = req.query.filtro || '';
  const pool = await getPool();
  const request = pool.request();
  let where = 'activo=1';
  if (buscar) {
    request.input('like', sql.NVarChar, `%${buscar}%`);
    where += " AND (nombre LIKE @like OR apellido LIKE @like OR telefono LIKE @like)";
  }
  if (filtro === 'con_deuda') where += ' AND saldo_deuda > 0';

  const result = await request.query(
    `SELECT *, CONCAT(nombre,' ',ISNULL(apellido,'')) AS nombre_completo FROM clientes WHERE ${where} ORDER BY nombre`
  );
  res.json(result.recordset);
}

async function save(req, res) {
  const {
    id, nombre, apellido, telefono, email, calle, colonia,
    ciudad, estado, cp, rfc, limite_credito, notas,
  } = req.body;

  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido.' });

  const data = {
    nombre: nombre.trim(),
    apellido: (apellido || '').trim(),
    telefono: (telefono || '').trim(),
    email: (email || '').trim(),
    calle: (calle || '').trim(),
    colonia: (colonia || '').trim(),
    ciudad: (ciudad || '').trim(),
    estado: (estado || '').trim(),
    cp: (cp || '').trim(),
    rfc: (rfc || '').trim(),
    limite_credito: parseFloat(limite_credito) || 0,
    notas: (notas || '').trim(),
  };

  const pool = await getPool();
  try {
    if (id) {
      const request = pool.request().input('id', sql.Int, id);
      const sets = [];
      for (const [k, v] of Object.entries(data)) {
        request.input(k, v);
        sets.push(`${k}=@${k}`);
      }
      await request.query(`UPDATE clientes SET ${sets.join(', ')} WHERE id=@id`);
      return res.json({ ok: true, msg: 'Cliente actualizado.' });
    }
    const request = pool.request();
    const cols = Object.keys(data);
    for (const k of cols) request.input(k, data[k]);
    await request.query(`INSERT INTO clientes (${cols.join(', ')}) VALUES (${cols.map((c) => `@${c}`).join(', ')})`);
    res.json({ ok: true, msg: 'Cliente registrado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query('UPDATE clientes SET activo=0 WHERE id=@id');
  res.json({ ok: true });
}

async function historial(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT TOP 20 folio, total, tipo_venta, estado, saldo_pendiente, created_at
      FROM ventas WHERE cliente_id=@id ORDER BY created_at DESC
    `);
  res.json(result.recordset);
}

module.exports = { list, save, remove, historial };
