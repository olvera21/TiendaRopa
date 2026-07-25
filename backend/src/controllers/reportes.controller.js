const { sql, getPool } = require('../config/db');

function rangoPorPeriodo(periodo, fi, ff) {
  const hoy = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  if (periodo === 'hoy') return { fi: iso(hoy), ff: iso(hoy) };
  if (periodo === 'semana') {
    const dia = hoy.getDay() || 7;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - dia + 1);
    return { fi: iso(lunes), ff: iso(hoy) };
  }
  if (periodo === 'anio') return { fi: `${hoy.getFullYear()}-01-01`, ff: iso(hoy) };
  if (periodo === 'mes') {
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return { fi: iso(primero), ff: iso(hoy) };
  }
  return { fi: fi || iso(hoy), ff: ff || iso(hoy) };
}

async function reportes(req, res) {
  const periodo = req.query.periodo || 'mes';
  const { fi, ff } = rangoPorPeriodo(periodo, req.query.fi, req.query.ff);

  const pool = await getPool();
  const base = () => pool.request().input('fi', sql.Date, fi).input('ff', sql.Date, ff);
  const whereFecha = "CAST(v.created_at AS DATE) BETWEEN @fi AND @ff AND v.estado != 'cancelada'";

  const ventasTotal = await base().query(
    `SELECT COUNT(*) AS num, COALESCE(SUM(v.total),0) AS total, COALESCE(SUM(v.descuento_monto),0) AS descuentos FROM ventas v WHERE ${whereFecha}`
  );

  const costoVentas = await base().query(
    `SELECT COALESCE(SUM(vd.costo_unitario * vd.cantidad),0) AS costo FROM ventas_detalle vd JOIN ventas v ON v.id=vd.venta_id WHERE ${whereFecha}`
  );

  const gastosTotal = await base().query(
    'SELECT COALESCE(SUM(monto),0) AS total FROM gastos WHERE fecha BETWEEN @fi AND @ff'
  );

  const porDept = await base().query(`
    SELECT p.departamento, SUM(vd.cantidad) AS unidades, SUM(vd.subtotal) AS total,
           SUM(vd.costo_unitario*vd.cantidad) AS costo,
           SUM(vd.subtotal)-SUM(vd.costo_unitario*vd.cantidad) AS utilidad
    FROM ventas_detalle vd
    JOIN productos p ON p.id=vd.producto_id
    JOIN ventas v ON v.id=vd.venta_id
    WHERE ${whereFecha}
    GROUP BY p.departamento
  `);

  const porDia = await base().query(`
    SELECT CAST(v.created_at AS DATE) AS dia, SUM(v.total) AS total, COUNT(*) AS num
    FROM ventas v WHERE ${whereFecha}
    GROUP BY CAST(v.created_at AS DATE) ORDER BY dia
  `);

  const topProds = await base().query(`
    SELECT TOP 10 p.nombre, p.departamento, SUM(vd.cantidad) AS qty,
           SUM(vd.subtotal) AS total,
           SUM(vd.subtotal)-SUM(vd.costo_unitario*vd.cantidad) AS utilidad
    FROM ventas_detalle vd
    JOIN productos p ON p.id=vd.producto_id
    JOIN ventas v ON v.id=vd.venta_id
    WHERE ${whereFecha}
    GROUP BY p.id, p.nombre, p.departamento ORDER BY qty DESC
  `);

  const clientesDeuda = await pool.request().query(`
    SELECT TOP 20 c.nombre, c.apellido, c.telefono, c.saldo_deuda,
           COUNT(v.id) AS num_creditos
    FROM clientes c
    LEFT JOIN ventas v ON v.cliente_id=c.id AND v.saldo_pendiente>0
    WHERE c.saldo_deuda>0 AND c.activo=1
    GROUP BY c.id, c.nombre, c.apellido, c.telefono, c.saldo_deuda ORDER BY c.saldo_deuda DESC
  `);

  const rotacion = await base().query(`
    SELECT TOP 10 p.nombre, p.departamento,
           COALESCE(SUM(DISTINCT t.stock),0) AS stock_actual,
           COALESCE(SUM(vd.cantidad),0) AS vendido_periodo
    FROM productos p
    LEFT JOIN tallas t ON t.producto_id=p.id
    LEFT JOIN ventas_detalle vd ON vd.producto_id=p.id
    LEFT JOIN ventas v ON v.id=vd.venta_id AND CAST(v.created_at AS DATE) BETWEEN @fi AND @ff
    WHERE p.activo=1
    GROUP BY p.id, p.nombre, p.departamento ORDER BY vendido_periodo DESC
  `);

  const ventasTot = ventasTotal.recordset[0];
  const costo = costoVentas.recordset[0].costo;
  const gastos = gastosTotal.recordset[0].total;
  const utilidadBruta = ventasTot.total - costo;
  const utilidadNeta = utilidadBruta - gastos;

  res.json({
    periodo, fi, ff,
    ventas: ventasTot,
    costoVentas: costo,
    gastosTotal: gastos,
    utilidadBruta,
    utilidadNeta,
    porDepartamento: porDept.recordset,
    porDia: porDia.recordset,
    topProductos: topProds.recordset,
    clientesConDeuda: clientesDeuda.recordset,
    rotacionInventario: rotacion.recordset,
  });
}

async function dashboard(_req, res) {
  const pool = await getPool();

  const ventasHoy = await pool.request().query(
    "SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS num FROM ventas WHERE CAST(created_at AS DATE)=CAST(GETDATE() AS DATE) AND estado != 'cancelada'"
  );
  const ventasMes = await pool.request().query(
    "SELECT COALESCE(SUM(total),0) AS total FROM ventas WHERE MONTH(created_at)=MONTH(GETDATE()) AND YEAR(created_at)=YEAR(GETDATE()) AND estado != 'cancelada'"
  );
  const clientesDeuda = await pool.request().query(
    'SELECT COUNT(*) AS num, COALESCE(SUM(saldo_deuda),0) AS total FROM clientes WHERE saldo_deuda > 0'
  );
  const productosBajo = await pool.request().query(
    'SELECT COUNT(*) AS num FROM tallas WHERE stock <= stock_minimo AND stock > 0'
  );
  const sinStock = await pool.request().query('SELECT COUNT(*) AS num FROM tallas WHERE stock = 0');

  const ventasDept = await pool.request().query(`
    SELECT p.departamento, SUM(vd.subtotal) AS total, COUNT(DISTINCT v.id) AS ventas
    FROM ventas v
    JOIN ventas_detalle vd ON vd.venta_id = v.id
    JOIN productos p ON p.id = vd.producto_id
    WHERE MONTH(v.created_at)=MONTH(GETDATE()) AND YEAR(v.created_at)=YEAR(GETDATE())
      AND v.estado != 'cancelada'
    GROUP BY p.departamento
  `);

  const ultimasVentas = await pool.request().query(`
    SELECT TOP 8 v.*, c.nombre, c.apellido
    FROM ventas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    ORDER BY v.created_at DESC
  `);

  const topProductos = await pool.request().query(`
    SELECT TOP 6 p.nombre, p.departamento, SUM(vd.cantidad) AS qty, SUM(vd.subtotal) AS total
    FROM ventas_detalle vd
    JOIN productos p ON p.id = vd.producto_id
    JOIN ventas v ON v.id = vd.venta_id
    WHERE MONTH(v.created_at)=MONTH(GETDATE()) AND v.estado != 'cancelada'
    GROUP BY p.id, p.nombre, p.departamento ORDER BY qty DESC
  `);

  res.json({
    ventasHoy: ventasHoy.recordset[0],
    ventasMes: ventasMes.recordset[0].total,
    clientesConDeuda: clientesDeuda.recordset[0],
    productosStockBajo: productosBajo.recordset[0].num,
    productosSinStock: sinStock.recordset[0].num,
    ventasPorDepartamento: ventasDept.recordset,
    ultimasVentas: ultimasVentas.recordset,
    topProductos: topProductos.recordset,
  });
}

module.exports = { reportes, dashboard };
