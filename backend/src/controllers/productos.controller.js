?const { sql, getPool } = require('../config/db');
const { subirImagen, cloudinaryConfigured } = require('../config/cloudinary');

const DEPARTAMENTOS = ['ropa'];

/** GET /api/productos?dept=&q=&cat= */
async function list(req, res) {
  let dept = req.query.dept || 'ropa';
  if (!DEPARTAMENTOS.includes(dept)) dept = 'ropa';
  const buscar = (req.query.q || '').trim();
  const catFilter = parseInt(req.query.cat, 10) || 0;

  const pool = await getPool();

  const categorias = await pool
    .request()
    .input('tipo', sql.NVarChar, dept)
    .query('SELECT * FROM categorias WHERE tipo=@tipo AND activo=1 ORDER BY nombre');

  const request = pool.request().input('dept', sql.NVarChar, dept);
  let where = 'p.departamento=@dept AND p.activo=1';
  if (buscar) {
    request.input('buscar', sql.NVarChar, `%${buscar}%`);
    where += ' AND (p.nombre LIKE @buscar OR p.sku LIKE @buscar OR p.codigo_barras LIKE @buscar)';
  }
  if (catFilter) {
    request.input('cat', sql.Int, catFilter);
    where += ' AND p.categoria_id=@cat';
  }

  const productos = await request.query(`
    SELECT p.*, c.nombre AS cat_nombre,
           COALESCE(SUM(t.stock),0) AS stock_total,
           COUNT(t.id) AS num_tallas
    FROM productos p
    LEFT JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN tallas t ON t.producto_id = p.id
    WHERE ${where}
    GROUP BY p.id, p.sku, p.codigo_barras, p.nombre, p.descripcion, p.categoria_id,
             p.departamento, p.marca, p.modelo, p.color, p.material, p.costo_unitario,
             p.precio_publico, p.aplica_iva, p.iva_porcentaje, p.merma_porcentaje,
             p.imagen, p.activo, p.created_at, c.nombre
    ORDER BY p.nombre
  `);

  res.json({ categorias: categorias.recordset, productos: productos.recordset });
}

async function nextSku(dept) {
  const pool = await getPool();
  const prefix = dept.substring(0, 3).toUpperCase();
  const result = await pool
    .request()
    .input('like', sql.NVarChar, `${prefix}-%`)
    .query("SELECT TOP 1 sku FROM productos WHERE sku LIKE @like ORDER BY id DESC");
  let next = 1;
  const last = result.recordset[0]?.sku;
  if (last) {
    const m = last.match(/-(\d+)$/);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  let sku = `${prefix}-${String(next).padStart(3, '0')}`;
  // asegurar unicidad
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const dup = await pool.request().input('sku', sql.NVarChar, sku).query('SELECT COUNT(*) AS n FROM productos WHERE sku=@sku');
    if (dup.recordset[0].n === 0) break;
    next += 1;
    sku = `${prefix}-${String(next).padStart(3, '0')}`;
  }
  return sku;
}

/** POST /api/productos  (multipart: campos + imagen + tallas[]/stocks[] como JSON) */
async function save(req, res) {
  const body = req.body;
  const id = parseInt(body.id, 10) || 0;
  let dept = body.departamento || 'ropa';
  if (!DEPARTAMENTOS.includes(dept)) dept = 'ropa';

  const data = {
    codigo_barras: body.codigo_barras?.trim() || null,
    nombre: (body.nombre || '').trim(),
    descripcion: (body.descripcion || '').trim(),
    categoria_id: parseInt(body.categoria_id, 10) || null,
    departamento: dept,
    marca: (body.marca || '').trim(),
    modelo: (body.modelo || '').trim(),
    color: (body.color || '').trim(),
    material: (body.material || '').trim(),
    costo_unitario: parseFloat(body.costo_unitario) || 0,
    precio_publico: parseFloat(body.precio_publico) || 0,
    aplica_iva: body.aplica_iva === 'true' || body.aplica_iva === true || body.aplica_iva === '1' ? 1 : 0,
    iva_porcentaje: parseFloat(body.iva_porcentaje) || 0,
    merma_porcentaje: parseFloat(body.merma_porcentaje) || 0,
  };
  if (req.file) {
    if (!cloudinaryConfigured) {
      return res.status(500).json({ error: 'El almacenamiento de im�genes (Cloudinary) no est� configurado en el servidor.' });
    }
    try {
      data.imagen = await subirImagen(req.file.buffer);
    } catch (e) {
      return res.status(500).json({ error: 'No se pudo subir la imagen: ' + e.message });
    }
  }

  const pool = await getPool();

  try {
    if (id > 0) {
      const request = pool.request().input('id', sql.Int, id);
      const sets = [];
      for (const [k, v] of Object.entries(data)) {
        request.input(k, v);
        sets.push(`${k}=@${k}`);
      }
      await request.query(`UPDATE productos SET ${sets.join(', ')} WHERE id=@id`);
      return res.json({ ok: true, msg: 'Producto actualizado correctamente.' });
    }

    data.sku = await nextSku(dept);
    const request = pool.request();
    const cols = Object.keys(data);
    for (const k of cols) request.input(k, data[k]);
    const result = await request.query(
      `INSERT INTO productos (${cols.join(', ')}) OUTPUT INSERTED.id VALUES (${cols.map((c) => `@${c}`).join(', ')})`
    );
    const newId = result.recordset[0].id;

    // Tallas iniciales: se esperan como JSON string en body.tallas = [{talla, stock}]
    let tallas = [];
    try {
      tallas = JSON.parse(body.tallas || '[]');
    } catch (_e) {
      tallas = [];
    }
    for (const t of tallas) {
      const nombre = (t.talla || '').trim();
      if (!nombre) continue;
      const stock = parseInt(t.stock, 10) || 0;
      const insTalla = await pool
        .request()
        .input('producto_id', sql.Int, newId)
        .input('talla', sql.NVarChar, nombre)
        .input('stock', sql.Int, stock)
        .query('INSERT INTO tallas (producto_id, talla, stock) OUTPUT INSERTED.id VALUES (@producto_id,@talla,@stock)');
      if (stock > 0) {
        await pool
          .request()
          .input('producto_id', sql.Int, newId)
          .input('tipo', sql.NVarChar, 'entrada')
          .input('cantidad', sql.Int, stock)
          .input('motivo', sql.NVarChar, 'Registro inicial')
          .query('INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, motivo) VALUES (@producto_id,@tipo,@cantidad,@motivo)');
      }
      void insTalla;
    }

    res.json({ ok: true, msg: 'Producto registrado correctamente.', id: newId, sku: data.sku });
  } catch (err) {
    if (String(err.message).includes('codigo_barras')) {
      return res.status(409).json({ error: 'El código de barras ingresado ya existe en otro producto.' });
    }
    res.status(500).json({ error: `Error: ${err.message}` });
  }
}

async function remove(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query('UPDATE productos SET activo=0 WHERE id=@id');
  res.json({ ok: true });
}

/** GET /api/productos/:id/tallas */
async function getTallas(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();
  const result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM tallas WHERE producto_id=@id ORDER BY talla');
  res.json(result.recordset);
}

async function addTalla(req, res) {
  const producto_id = parseInt(req.body.producto_id, 10);
  const talla = (req.body.talla || '').trim();
  const stock = parseInt(req.body.stock, 10) || 0;
  if (!producto_id || !talla) return res.status(400).json({ error: 'Talla y producto son requeridos.' });

  const pool = await getPool();
  await pool
    .request()
    .input('producto_id', sql.Int, producto_id)
    .input('talla', sql.NVarChar, talla)
    .input('stock', sql.Int, stock)
    .query('INSERT INTO tallas (producto_id, talla, stock) VALUES (@producto_id,@talla,@stock)');

  if (stock > 0) {
    await pool
      .request()
      .input('producto_id', sql.Int, producto_id)
      .input('tipo', sql.NVarChar, 'entrada')
      .input('cantidad', sql.Int, stock)
      .input('motivo', sql.NVarChar, 'Ajuste de inventario')
      .query('INSERT INTO inventario_movimientos (producto_id, tipo, cantidad, motivo) VALUES (@producto_id,@tipo,@cantidad,@motivo)');
  }
  res.json({ ok: true });
}

async function updateStock(req, res) {
  const talla_id = parseInt(req.body.talla_id, 10);
  const stock = parseInt(req.body.stock, 10) || 0;
  const pool = await getPool();
  await pool.request().input('stock', sql.Int, stock).input('id', sql.Int, talla_id).query('UPDATE tallas SET stock=@stock WHERE id=@id');
  res.json({ ok: true });
}

async function departamentos(_req, res) {
  const pool = await getPool();
  const result = await pool.request().query(
    "SELECT DISTINCT departamento FROM productos WHERE activo=1 AND departamento IS NOT NULL ORDER BY departamento"
  );
  res.json(result.recordset.map((r) => r.departamento));
}

module.exports = { list, save, remove, getTallas, addTalla, updateStock, departamentos };
