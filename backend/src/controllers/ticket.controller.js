const { sql, getPool } = require('../config/db');

async function getTicket(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();

  const ventaResult = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT v.*,
             CONCAT(ISNULL(c.nombre,''),' ',ISNULL(c.apellido,'')) AS cliente_nombre,
             c.telefono AS cliente_tel,
             u.nombre AS vendedor_nombre
      FROM ventas v
      LEFT JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN usuarios u ON u.id = v.usuario_id
      WHERE v.id = @id
    `);
  const venta = ventaResult.recordset[0];
  if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

  const detalle = await pool
    .request()
    .input('id', sql.Int, id)
    .query(`
      SELECT vd.*, p.nombre AS prod_nombre, p.sku, t.talla
      FROM ventas_detalle vd
      JOIN productos p ON p.id = vd.producto_id
      LEFT JOIN tallas t ON t.id = vd.talla_id
      WHERE vd.venta_id = @id
    `);

  const pagos = await pool
    .request()
    .input('id', sql.Int, id)
    .query('SELECT * FROM pagos WHERE venta_id=@id ORDER BY created_at ASC');

  res.json({ venta, items: detalle.recordset, pagos: pagos.recordset });
}

module.exports = { getTicket };
