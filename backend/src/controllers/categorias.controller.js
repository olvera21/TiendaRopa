const { sql, getPool } = require('../config/db');

async function list(_req, res) {
  const pool = await getPool();

  const principales = await pool.request().query(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM productos p WHERE p.categoria_id=c.id AND p.activo=1) AS num_productos,
      (SELECT COUNT(*) FROM categorias s WHERE s.parent_id=c.id AND s.activo=1) AS num_subcats
    FROM categorias c
    WHERE c.parent_id IS NULL
    ORDER BY c.nombre
  `);

  const subcategorias = await pool.request().query(`
    SELECT c.*, par.nombre AS nombre_padre,
      (SELECT COUNT(*) FROM productos p WHERE p.categoria_id=c.id AND p.activo=1) AS num_productos
    FROM categorias c
    LEFT JOIN categorias par ON par.id = c.parent_id
    WHERE c.parent_id IS NOT NULL
    ORDER BY par.nombre, c.nombre
  `);

  const catsSelect = await pool.request().query(
    "SELECT id, nombre FROM categorias WHERE parent_id IS NULL AND activo=1 ORDER BY nombre"
  );

  res.json({
    principales: principales.recordset,
    subcategorias: subcategorias.recordset,
    opcionesPadre: catsSelect.recordset,
  });
}

async function save(req, res) {
  const { id, nombre, parent_id, descripcion, tipo } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido.' });
  const pool = await getPool();

  try {
    if (id) {
      await pool
        .request()
        .input('nombre', sql.NVarChar, nombre)
        .input('parent_id', sql.Int, parent_id || null)
        .input('descripcion', sql.NVarChar, descripcion || null)
        .input('id', sql.Int, id)
        .query('UPDATE categorias SET nombre=@nombre, parent_id=@parent_id, descripcion=@descripcion WHERE id=@id');
      return res.json({ ok: true, msg: 'Categoría actualizada.' });
    }
    await pool
      .request()
      .input('nombre', sql.NVarChar, nombre)
      .input('parent_id', sql.Int, parent_id || null)
      .input('descripcion', sql.NVarChar, descripcion || null)
      .input('tipo', sql.NVarChar, tipo || 'ropa')
      .query('INSERT INTO categorias (nombre, parent_id, descripcion, tipo) VALUES (@nombre,@parent_id,@descripcion,@tipo)');
    res.json({ ok: true, msg: 'Categoría creada correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function toggle(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query('UPDATE categorias SET activo = ~activo WHERE id=@id');
  res.json({ ok: true });
}

async function remove(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();

  const prods = await pool
    .request()
    .input('id', sql.Int, id)
    .query('SELECT COUNT(*) AS n FROM productos WHERE categoria_id=@id AND activo=1');
  if (prods.recordset[0].n > 0) {
    return res.status(409).json({ error: 'Tiene productos activos. Muévelos primero.' });
  }

  const subs = await pool
    .request()
    .input('id', sql.Int, id)
    .query('SELECT COUNT(*) AS n FROM categorias WHERE parent_id=@id AND activo=1');
  if (subs.recordset[0].n > 0) {
    return res.status(409).json({ error: 'Tiene subcategorías activas. Elimínalas primero.' });
  }

  await pool.request().input('id', sql.Int, id).query('DELETE FROM categorias WHERE id=@id');
  res.json({ ok: true });
}

module.exports = { list, save, toggle, remove };
