const { sql, getPool } = require('../config/db');

async function list(req, res) {
  const mes = req.query.mes || new Date().toISOString().slice(0, 7);
  const cat = req.query.cat || '';
  const pool = await getPool();
  const request = pool.request();
  let where = '1=1';
  if (mes) {
    request.input('mes', sql.NVarChar, mes);
    where += " AND FORMAT(fecha,'yyyy-MM') = @mes";
  }
  if (cat) {
    request.input('cat', sql.NVarChar, cat);
    where += ' AND categoria = @cat';
  }

  const gastos = await request.query(
    `SELECT g.*, u.nombre AS usuario_nombre FROM gastos g LEFT JOIN usuarios u ON u.id=g.usuario_id WHERE ${where} ORDER BY g.fecha DESC, g.id DESC`
  );

  const totCat = await pool
    .request()
    .input('mes', sql.NVarChar, mes)
    .query(`SELECT categoria, SUM(monto) AS total FROM gastos WHERE FORMAT(fecha,'yyyy-MM')=@mes GROUP BY categoria ORDER BY SUM(monto) DESC`);

  res.json({ gastos: gastos.recordset, totalesPorCategoria: totCat.recordset });
}

async function save(req, res) {
  const {
    id, concepto, monto, categoria = 'general', forma_pago = 'efectivo',
    fecha, notas = '', proveedor = '',
  } = req.body;

  const montoNum = parseFloat(monto);
  if (!concepto || !montoNum || montoNum <= 0) {
    return res.status(400).json({ error: 'Concepto y monto son requeridos.' });
  }
  const fechaVal = fecha || new Date().toISOString().slice(0, 10);

  const pool = await getPool();
  try {
    if (id) {
      await pool
        .request()
        .input('concepto', sql.NVarChar, concepto)
        .input('monto', sql.Decimal(10, 2), montoNum)
        .input('categoria', sql.NVarChar, categoria)
        .input('forma_pago', sql.NVarChar, forma_pago)
        .input('fecha', sql.Date, fechaVal)
        .input('notas', sql.NVarChar, notas)
        .input('proveedor', sql.NVarChar, proveedor)
        .input('id', sql.Int, id)
        .query(`UPDATE gastos SET concepto=@concepto, monto=@monto, categoria=@categoria, forma_pago=@forma_pago,
                fecha=@fecha, notas=@notas, proveedor=@proveedor WHERE id=@id`);
    } else {
      await pool
        .request()
        .input('concepto', sql.NVarChar, concepto)
        .input('monto', sql.Decimal(10, 2), montoNum)
        .input('categoria', sql.NVarChar, categoria)
        .input('forma_pago', sql.NVarChar, forma_pago)
        .input('fecha', sql.Date, fechaVal)
        .input('notas', sql.NVarChar, notas)
        .input('proveedor', sql.NVarChar, proveedor)
        .input('usuario_id', sql.Int, req.user.id)
        .query(`INSERT INTO gastos (concepto, monto, categoria, forma_pago, fecha, notas, proveedor, usuario_id)
                VALUES (@concepto,@monto,@categoria,@forma_pago,@fecha,@notas,@proveedor,@usuario_id)`);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query('DELETE FROM gastos WHERE id=@id');
  res.json({ ok: true });
}

module.exports = { list, save, remove };
