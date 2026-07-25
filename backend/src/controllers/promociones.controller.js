const { sql, getPool } = require('../config/db');

async function list(_req, res) {
  const pool = await getPool();

  const categorias = await pool.request().query('SELECT * FROM categorias WHERE activo=1 ORDER BY tipo, nombre');
  const productos = await pool.request().query(
    "SELECT id, nombre, sku, departamento, categoria_id FROM productos WHERE activo=1 ORDER BY nombre"
  );
  const tallas = await pool.request().query(`
    SELECT t.id, t.producto_id, t.talla, t.stock
    FROM tallas t
    INNER JOIN productos p ON p.id = t.producto_id
    WHERE p.activo=1
    ORDER BY t.talla
  `);
  const promociones = await pool.request().query(`
    SELECT p.*, c.nombre AS cat_nombre, pr.nombre AS prod_nombre, t.talla AS talla_nombre
    FROM promociones p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN productos pr ON pr.id = p.producto_id
    LEFT JOIN tallas t ON t.id = p.talla_id
    ORDER BY p.activo DESC, p.id DESC
  `);

  // Agrupamos las tallas dentro de cada producto para que el buscador
  // del módulo de promociones pueda filtrar/mostrar talla por talla.
  const tallasPorProducto = new Map();
  for (const t of tallas.recordset) {
    if (!tallasPorProducto.has(t.producto_id)) tallasPorProducto.set(t.producto_id, []);
    tallasPorProducto.get(t.producto_id).push({ id: t.id, talla: t.talla, stock: t.stock });
  }
  const productosConTallas = productos.recordset.map((p) => ({
    ...p,
    tallas: tallasPorProducto.get(p.id) || [],
  }));

  res.json({
    categorias: categorias.recordset,
    productos: productosConTallas,
    promociones: promociones.recordset,
  });
}

async function save(req, res) {
  const {
    id, nombre, codigo, tipo, valor, departamento,
    categoria_id, producto_id, talla_id, fecha_inicio, fecha_fin, activo,
  } = req.body;

  if (!nombre) return res.status(400).json({ error: 'El nombre es requerido.' });

  const data = {
    nombre: nombre.trim(),
    codigo: codigo ? codigo.trim().toUpperCase() : null,
    tipo: tipo || 'porcentaje',
    valor: parseFloat(valor) || 0,
    departamento: departamento || null,
    categoria_id: parseInt(categoria_id, 10) || null,
    producto_id: parseInt(producto_id, 10) || null,
    talla_id: parseInt(talla_id, 10) || null,
    fecha_inicio: fecha_inicio || null,
    fecha_fin: fecha_fin || null,
    activo: activo === undefined ? 1 : (activo ? 1 : 0),
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
      await request.query(`UPDATE promociones SET ${sets.join(', ')} WHERE id=@id`);
      return res.json({ ok: true, msg: 'Promoción actualizada.' });
    }
    const request = pool.request();
    const cols = Object.keys(data);
    for (const k of cols) request.input(k, data[k]);
    await request.query(`INSERT INTO promociones (${cols.join(', ')}) VALUES (${cols.map((c) => `@${c}`).join(', ')})`);
    res.json({ ok: true, msg: 'Promoción creada correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function toggle(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query('UPDATE promociones SET activo = ~activo WHERE id=@id');
  res.json({ ok: true });
}

async function remove(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query('DELETE FROM promociones WHERE id=@id');
  res.json({ ok: true });
}

module.exports = { list, save, toggle, remove };
