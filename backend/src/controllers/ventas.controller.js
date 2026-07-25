const { sql, getPool } = require('../config/db');
const { generateFolio } = require('../utils/helpers');

async function buscarProducto(req, res) {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  const pool = await getPool();
  const result = await pool
    .request()
    .input('like', sql.NVarChar, `%${q}%`)
    .input('exact', sql.NVarChar, q)
    .query(`
      SELECT TOP 40 p.id, p.nombre, p.sku, p.codigo_barras, p.departamento, p.categoria_id,
             p.precio_publico, p.costo_unitario, p.imagen,
             t.id AS talla_id, t.talla, t.stock
      FROM productos p
      LEFT JOIN tallas t ON t.producto_id = p.id
      WHERE p.activo = 1
        AND (p.nombre LIKE @like OR p.sku LIKE @like OR p.codigo_barras = @exact)
      ORDER BY p.nombre
    `);
  res.json(result.recordset);
}

async function catalogo(req, res) {
  const cat = (req.query.cat || '').trim();
  const pool = await getPool();
  const request = pool.request();
  let where = 'p.activo = 1';
  if (cat) {
    request.input('cat', sql.NVarChar, cat);
    where += ' AND p.departamento = @cat';
  }
  const result = await request.query(`
    SELECT TOP 300 p.id, p.nombre, p.sku, p.departamento, p.categoria_id,
           p.precio_publico, p.costo_unitario, p.imagen,
           t.id AS talla_id, t.talla, t.stock
    FROM productos p
    LEFT JOIN tallas t ON t.producto_id = p.id
    WHERE ${where}
    ORDER BY p.nombre
  `);
  res.json(result.recordset);
}

async function departamentos(_req, res) {
  const pool = await getPool();
  const result = await pool.request().query(
    "SELECT DISTINCT departamento FROM productos WHERE activo=1 AND departamento IS NOT NULL ORDER BY departamento"
  );
  res.json(result.recordset.map((r) => r.departamento));
}

async function buscarCliente(req, res) {
  const q = (req.query.q || '').trim();
  const pool = await getPool();
  const result = await pool
    .request()
    .input('like', sql.NVarChar, `%${q}%`)
    .query(`
      SELECT TOP 10 id, nombre, apellido, telefono, saldo_deuda, limite_credito
      FROM clientes
      WHERE activo=1 AND (nombre LIKE @like OR apellido LIKE @like OR telefono LIKE @like)
    `);
  res.json(result.recordset);
}

async function nuevoCliente(req, res) {
  const { nombre, telefono, limite_credito } = req.body;
  if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  const pool = await getPool();
  const result = await pool
    .request()
    .input('nombre', sql.NVarChar, nombre.trim())
    .input('telefono', sql.NVarChar, telefono || '')
    .input('limite', sql.Decimal(10, 2), parseFloat(limite_credito) || 0)
    .query(`INSERT INTO clientes (nombre,telefono,limite_credito)
            OUTPUT INSERTED.id VALUES (@nombre,@telefono,@limite)`);
  const id = result.recordset[0].id;
  res.json({ id, nombre: nombre.trim(), telefono, saldo_deuda: 0, limite_credito: parseFloat(limite_credito) || 0 });
}

async function promocionesActivas(_req, res) {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT * FROM promociones
    WHERE activo=1
      AND (fecha_inicio IS NULL OR fecha_inicio <= CAST(GETDATE() AS DATE))
      AND (fecha_fin IS NULL OR fecha_fin >= CAST(GETDATE() AS DATE))
  `);
  res.json(result.recordset);
}

/** POST /api/ventas  procesar venta (transacción) */
async function procesarVenta(req, res) {
  const {
    items, cliente_id, tipo_venta = 'contado', forma_pago = 'efectivo',
    descuento_p = 0, desc_monto = 0, monto_pagado = 0, notas = '',
    num_meses = 0, tasa_interes = 0, enganche = 0, cuota_mensual = 0,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Sin productos' });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const subtotal = items.reduce((acc, i) => acc + i.precio * i.qty, 0);
    const descMonto = parseFloat(desc_monto) || 0;
    const total = Math.max(0, subtotal - descMonto);
    const montoPagado = parseFloat(monto_pagado) || 0;
    const saldoPendiente = Math.max(0, total - montoPagado);
    const folio = generateFolio();
    const estado = ['credito', 'a_meses'].includes(tipo_venta)
      ? tipo_venta
      : saldoPendiente > 0 ? 'pendiente' : 'pagada';

    const ventaReq = new sql.Request(transaction);
    const ventaResult = await ventaReq
      .input('folio', sql.NVarChar, folio)
      .input('cliente_id', sql.Int, cliente_id || null)
      .input('tipo_venta', sql.NVarChar, tipo_venta)
      .input('forma_pago', sql.NVarChar, forma_pago)
      .input('subtotal', sql.Decimal(10, 2), subtotal)
      .input('descuento_monto', sql.Decimal(10, 2), descMonto)
      .input('descuento_porcentaje', sql.Decimal(5, 2), parseFloat(descuento_p) || 0)
      .input('total', sql.Decimal(10, 2), total)
      .input('monto_pagado', sql.Decimal(10, 2), montoPagado)
      .input('saldo_pendiente', sql.Decimal(10, 2), saldoPendiente)
      .input('estado', sql.NVarChar, estado)
      .input('notas', sql.NVarChar, notas)
      .input('usuario_id', sql.Int, req.user.id)
      .input('num_meses', sql.Int, parseInt(num_meses, 10) || 0)
      .input('tasa_interes', sql.Decimal(5, 2), parseFloat(tasa_interes) || 0)
      .input('enganche', sql.Decimal(10, 2), parseFloat(enganche) || 0)
      .input('cuota_mensual', sql.Decimal(10, 2), parseFloat(cuota_mensual) || 0)
      .query(`
        INSERT INTO ventas (folio,cliente_id,tipo_venta,forma_pago,subtotal,descuento_monto,
          descuento_porcentaje,total,monto_pagado,saldo_pendiente,estado,notas,usuario_id,
          num_meses,tasa_interes,enganche,cuota_mensual)
        OUTPUT INSERTED.id
        VALUES (@folio,@cliente_id,@tipo_venta,@forma_pago,@subtotal,@descuento_monto,
          @descuento_porcentaje,@total,@monto_pagado,@saldo_pendiente,@estado,@notas,@usuario_id,
          @num_meses,@tasa_interes,@enganche,@cuota_mensual)
      `);
    const ventaId = ventaResult.recordset[0].id;

    for (const item of items) {
      const detReq = new sql.Request(transaction);
      await detReq
        .input('venta_id', sql.Int, ventaId)
        .input('producto_id', sql.Int, item.prod_id)
        .input('talla_id', sql.Int, item.talla_id || null)
        .input('cantidad', sql.Int, item.qty)
        .input('precio_unitario', sql.Decimal(10, 2), item.precio)
        .input('costo_unitario', sql.Decimal(10, 2), item.costo || 0)
        .input('subtotal', sql.Decimal(10, 2), item.precio * item.qty)
        .query(`INSERT INTO ventas_detalle (venta_id,producto_id,talla_id,cantidad,precio_unitario,costo_unitario,subtotal)
                VALUES (@venta_id,@producto_id,@talla_id,@cantidad,@precio_unitario,@costo_unitario,@subtotal)`);

      if (item.talla_id) {
        const stockReq = new sql.Request(transaction);
        await stockReq
          .input('qty', sql.Int, item.qty)
          .input('talla_id', sql.Int, item.talla_id)
          .query('UPDATE tallas SET stock = stock - @qty WHERE id=@talla_id');
      }
    }

    if (cliente_id && saldoPendiente > 0) {
      const clienteReq = new sql.Request(transaction);
      await clienteReq
        .input('saldo', sql.Decimal(10, 2), saldoPendiente)
        .input('cliente_id', sql.Int, cliente_id)
        .query('UPDATE clientes SET saldo_deuda = saldo_deuda + @saldo WHERE id=@cliente_id');
    }

    if (montoPagado > 0 && cliente_id) {
      const pagoReq = new sql.Request(transaction);
      await pagoReq
        .input('venta_id', sql.Int, ventaId)
        .input('cliente_id', sql.Int, cliente_id)
        .input('monto', sql.Decimal(10, 2), montoPagado)
        .input('forma_pago', sql.NVarChar, forma_pago)
        .query('INSERT INTO pagos (venta_id,cliente_id,monto,forma_pago) VALUES (@venta_id,@cliente_id,@monto,@forma_pago)');
    }

    await transaction.commit();
    res.json({ ok: true, venta_id: ventaId, folio, total, saldo: saldoPendiente });
  } catch (err) {
    await transaction.rollback();
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  buscarProducto, catalogo, departamentos, buscarCliente,
  nuevoCliente, promocionesActivas, procesarVenta,
};
