const { sql, getPool } = require('../config/db');

async function buscarVenta(req, res) {
  const folio = (req.query.folio || '').trim();
  if (!folio) return res.status(400).json({ error: 'Folio requerido' });

  const pool = await getPool();
  const ventaResult = await pool
    .request()
    .input('folio', sql.NVarChar, folio)
    .query(`
      SELECT v.*, CONCAT(ISNULL(c.nombre,''),' ',ISNULL(c.apellido,'')) AS cliente_nombre
      FROM ventas v
      LEFT JOIN clientes c ON c.id=v.cliente_id
      WHERE v.folio = @folio
    `);
  const venta = ventaResult.recordset[0];
  if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

  const detalle = await pool
    .request()
    .input('venta_id', sql.Int, venta.id)
    .query(`
      SELECT vd.*, p.nombre AS prod_nombre, t.talla
      FROM ventas_detalle vd
      JOIN productos p ON p.id=vd.producto_id
      LEFT JOIN tallas t ON t.id=vd.talla_id
      WHERE vd.venta_id=@venta_id
    `);
  venta.items = detalle.recordset;
  res.json(venta);
}

async function list(req, res) {
  const mes = req.query.mes || new Date().toISOString().slice(0, 7);
  const pool = await getPool();
  const request = pool.request();
  let where = '1=1';
  if (mes) {
    request.input('mes', sql.NVarChar, mes);
    where += " AND FORMAT(d.created_at,'yyyy-MM') = @mes";
  }
  const result = await request.query(`
    SELECT d.*, v.folio,
           CONCAT(ISNULL(c.nombre,''),' ',ISNULL(c.apellido,'')) AS cliente_nombre,
           u.nombre AS usuario_nombre
    FROM devoluciones d
    LEFT JOIN ventas v ON v.id = d.venta_id
    LEFT JOIN clientes c ON c.id = v.cliente_id
    LEFT JOIN usuarios u ON u.id = d.usuario_id
    WHERE ${where}
    ORDER BY d.created_at DESC
  `);
  res.json(result.recordset);
}

async function registrar(req, res) {
  const { venta_id, motivo = '', tipo_devolucion = 'reembolso', notas = '', items } = req.body;
  if (!venta_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Venta e ítems son requeridos.' });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    const montoTotal = items.reduce((acc, i) => acc + parseFloat(i.precio) * parseInt(i.qty, 10), 0);

    const devResult = await new sql.Request(transaction)
      .input('venta_id', sql.Int, venta_id)
      .input('motivo', sql.NVarChar, motivo)
      .input('tipo_devolucion', sql.NVarChar, tipo_devolucion)
      .input('monto_total', sql.Decimal(10, 2), montoTotal)
      .input('notas', sql.NVarChar, notas)
      .input('usuario_id', sql.Int, req.user.id)
      .query(`INSERT INTO devoluciones (venta_id, motivo, tipo_devolucion, monto_total, notas, usuario_id, estado)
              OUTPUT INSERTED.id
              VALUES (@venta_id,@motivo,@tipo_devolucion,@monto_total,@notas,@usuario_id,'procesada')`);
    const devId = devResult.recordset[0].id;

    for (const item of items) {
      await new sql.Request(transaction)
        .input('devolucion_id', sql.Int, devId)
        .input('producto_id', sql.Int, item.prod_id)
        .input('talla_id', sql.Int, item.talla_id || null)
        .input('cantidad', sql.Int, item.qty)
        .input('precio_unitario', sql.Decimal(10, 2), item.precio)
        .query(`INSERT INTO devoluciones_detalle (devolucion_id, producto_id, talla_id, cantidad, precio_unitario)
                VALUES (@devolucion_id,@producto_id,@talla_id,@cantidad,@precio_unitario)`);

      if (item.talla_id) {
        await new sql.Request(transaction)
          .input('qty', sql.Int, item.qty)
          .input('talla_id', sql.Int, item.talla_id)
          .query('UPDATE tallas SET stock = stock + @qty WHERE id=@talla_id');
      }
    }

    await new sql.Request(transaction)
      .input('venta_id', sql.Int, venta_id)
      .query("UPDATE ventas SET estado='devuelta' WHERE id=@venta_id");

    await transaction.commit();
    res.json({ ok: true, devolucion_id: devId, monto: montoTotal });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query('DELETE FROM devoluciones WHERE id=@id');
  res.json({ ok: true });
}

module.exports = { buscarVenta, list, registrar, remove };
