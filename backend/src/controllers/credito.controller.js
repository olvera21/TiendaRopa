const { sql, getPool } = require('../config/db');

async function listDeudas(req, res) {
  const buscar = (req.query.q || '').trim();
  const filtroDept = req.query.dept || '';
  const orden = req.query.orden || 'fecha_asc';

  const pool = await getPool();
  const request = pool.request();
  let where = "v.saldo_pendiente > 0 AND v.estado != 'cancelada'";

  if (buscar) {
    request.input('like', sql.NVarChar, `%${buscar}%`);
    where += ' AND (c.nombre LIKE @like OR c.apellido LIKE @like OR v.folio LIKE @like OR c.telefono LIKE @like)';
  }
  if (filtroDept) {
    request.input('dept', sql.NVarChar, filtroDept);
    where += ` AND EXISTS (
      SELECT 1 FROM ventas_detalle vd2
      JOIN productos p2 ON p2.id = vd2.producto_id
      WHERE vd2.venta_id = v.id AND p2.departamento = @dept
    )`;
  }

  const orderSQL = orden === 'monto_desc' ? 'v.saldo_pendiente DESC' : 'v.created_at ASC';

  const result = await request.query(`
    SELECT v.id, v.folio, v.total, v.monto_pagado, v.saldo_pendiente,
           v.tipo_venta, v.forma_pago, v.estado, v.created_at, v.notas,
           c.id AS cliente_id,
           CONCAT(c.nombre,' ',ISNULL(c.apellido,'')) AS cliente_nombre,
           c.telefono, c.saldo_deuda AS total_deuda_cliente
    FROM ventas v
    JOIN clientes c ON c.id = v.cliente_id
    WHERE ${where}
    ORDER BY ${orderSQL}
  `);

  const resumen = await pool.request().query(`
    SELECT COUNT(*) AS num_ventas, COALESCE(SUM(saldo_pendiente),0) AS total_deuda
    FROM ventas WHERE saldo_pendiente > 0 AND estado != 'cancelada'
  `);

  res.json({ ventas: result.recordset, resumen: resumen.recordset[0] });
}

async function abonar(req, res) {
  const { venta_id, cliente_id, monto, forma_pago = 'efectivo', referencia = '' } = req.body;
  const montoNum = parseFloat(monto);
  if (!montoNum || montoNum <= 0) return res.status(400).json({ error: 'Monto inválido' });

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    await new sql.Request(transaction)
      .input('venta_id', sql.Int, venta_id)
      .input('cliente_id', sql.Int, cliente_id)
      .input('monto', sql.Decimal(10, 2), montoNum)
      .input('forma_pago', sql.NVarChar, forma_pago)
      .input('referencia', sql.NVarChar, referencia)
      .query('INSERT INTO pagos (venta_id,cliente_id,monto,forma_pago,referencia) VALUES (@venta_id,@cliente_id,@monto,@forma_pago,@referencia)');

    await new sql.Request(transaction)
      .input('monto', sql.Decimal(10, 2), montoNum)
      .input('venta_id', sql.Int, venta_id)
      .query(`UPDATE ventas
              SET monto_pagado = monto_pagado + @monto,
                  saldo_pendiente = CASE WHEN saldo_pendiente - @monto < 0 THEN 0 ELSE saldo_pendiente - @monto END
              WHERE id = @venta_id`);

    await new sql.Request(transaction)
      .input('venta_id', sql.Int, venta_id)
      .query("UPDATE ventas SET estado='pagada' WHERE id=@venta_id AND saldo_pendiente <= 0");

    await new sql.Request(transaction)
      .input('monto', sql.Decimal(10, 2), montoNum)
      .input('cliente_id', sql.Int, cliente_id)
      .query(`UPDATE clientes
              SET saldo_deuda = CASE WHEN saldo_deuda - @monto < 0 THEN 0 ELSE saldo_deuda - @monto END
              WHERE id = @cliente_id`);

    await transaction.commit();

    const nuevo = await pool.request().input('venta_id', sql.Int, venta_id).query('SELECT saldo_pendiente FROM ventas WHERE id=@venta_id');
    res.json({ ok: true, saldo_nuevo: nuevo.recordset[0]?.saldo_pendiente });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message });
  }
}

async function historialAbonos(req, res) {
  const venta_id = parseInt(req.params.ventaId, 10);
  const pool = await getPool();
  const result = await pool
    .request()
    .input('venta_id', sql.Int, venta_id)
    .query('SELECT monto, forma_pago, referencia, created_at FROM pagos WHERE venta_id=@venta_id ORDER BY created_at ASC');
  res.json(result.recordset);
}

module.exports = { listDeudas, abonar, historialAbonos };
