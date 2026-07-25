const { sql, getPool } = require('../config/db');

async function productosPorDepto(req, res) {
  const dept = req.query.dept;
  if (!dept) return res.status(400).json({ error: 'Departamento requerido' });
  const pool = await getPool();
  const result = await pool
    .request()
    .input('dept', sql.NVarChar, dept)
    .query(`
      SELECT p.id AS prod_id, p.nombre, p.sku, t.id AS talla_id, t.talla, t.stock AS stock_sistema
      FROM productos p
      JOIN tallas t ON t.producto_id = p.id
      WHERE p.departamento = @dept AND p.activo = 1
      ORDER BY p.nombre, t.talla
    `);
  res.json(result.recordset);
}

async function aplicarAjuste(req, res) {
  const { ajustes, motivo = 'Inventario físico' } = req.body;
  if (!Array.isArray(ajustes) || ajustes.length === 0) {
    return res.status(400).json({ error: 'Sin ajustes que aplicar.' });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    for (const a of ajustes) {
      const tallaId = parseInt(a.talla_id, 10);
      const prodId = parseInt(a.prod_id, 10);
      const stockNuevo = parseInt(a.stock_fisico, 10);
      const stockViejo = parseInt(a.stock_sistema, 10);
      const diferencia = stockNuevo - stockViejo;
      if (diferencia === 0) continue;

      await new sql.Request(transaction)
        .input('stock', sql.Int, stockNuevo)
        .input('id', sql.Int, tallaId)
        .query('UPDATE tallas SET stock=@stock WHERE id=@id');

      await new sql.Request(transaction)
        .input('producto_id', sql.Int, prodId)
        .input('talla_id', sql.Int, tallaId)
        .input('tipo', sql.NVarChar, diferencia > 0 ? 'entrada' : 'salida')
        .input('cantidad', sql.Int, Math.abs(diferencia))
        .input('motivo', sql.NVarChar, motivo)
        .query('INSERT INTO inventario_movimientos (producto_id,talla_id,tipo,cantidad,motivo) VALUES (@producto_id,@talla_id,@tipo,@cantidad,@motivo)');
    }
    await transaction.commit();
    res.json({ ok: true, ajustados: ajustes.length });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message });
  }
}

async function movimientos(req, res) {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT TOP 100 m.*, p.nombre AS prod_nombre, t.talla
    FROM inventario_movimientos m
    JOIN productos p ON p.id = m.producto_id
    LEFT JOIN tallas t ON t.id = m.talla_id
    ORDER BY m.created_at DESC
  `);
  res.json(result.recordset);
}

module.exports = { productosPorDepto, aplicarAjuste, movimientos };
