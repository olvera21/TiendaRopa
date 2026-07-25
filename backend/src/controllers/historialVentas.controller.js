const { sql, getPool } = require('../config/db');

async function list(req, res) {
  const buscar = (req.query.q || '').trim();
  const estado = req.query.estado || '';
  const tipo = req.query.tipo || '';
  const fechaIni = req.query.fi || new Date().toISOString().slice(0, 8) + '01';
  const fechaFin = req.query.ff || new Date().toISOString().slice(0, 10);
  const pagina = Math.max(1, parseInt(req.query.p, 10) || 1);
  const porPagina = 25;
  const offset = (pagina - 1) * porPagina;

  const pool = await getPool();
  const buildRequest = () => {
    const request = pool.request().input('fi', sql.Date, fechaIni).input('ff', sql.Date, fechaFin);
    let where = 'CAST(v.created_at AS DATE) BETWEEN @fi AND @ff';
    if (buscar) {
      request.input('like', sql.NVarChar, `%${buscar}%`);
      where += ' AND (v.folio LIKE @like OR c.nombre LIKE @like OR c.apellido LIKE @like)';
    }
    if (estado) {
      request.input('estado', sql.NVarChar, estado);
      where += ' AND v.estado=@estado';
    }
    if (tipo) {
      request.input('tipo', sql.NVarChar, tipo);
      where += ' AND v.tipo_venta=@tipo';
    }
    return { request, where };
  };

  const { request: countReq, where: whereCount } = buildRequest();
  const totalRows = await countReq.query(
    `SELECT COUNT(DISTINCT v.id) AS n FROM ventas v LEFT JOIN clientes c ON c.id=v.cliente_id WHERE ${whereCount}`
  );

  const { request: listReq, where: whereList } = buildRequest();
  listReq.input('offset', sql.Int, offset).input('porPagina', sql.Int, porPagina);
  const ventas = await listReq.query(`
    SELECT v.*, CONCAT(ISNULL(c.nombre,''), ' ', ISNULL(c.apellido,'')) AS cliente_nombre, c.telefono
    FROM ventas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    WHERE ${whereList}
    ORDER BY v.created_at DESC
    OFFSET @offset ROWS FETCH NEXT @porPagina ROWS ONLY
  `);

  const { request: totReq, where: whereTot } = buildRequest();
  const totales = await totReq.query(
    `SELECT COUNT(*) AS num, COALESCE(SUM(v.total),0) AS total, COALESCE(SUM(v.descuento_monto),0) AS descuentos
     FROM ventas v LEFT JOIN clientes c ON c.id=v.cliente_id WHERE ${whereTot} AND v.estado != 'cancelada'`
  );

  res.json({
    ventas: ventas.recordset,
    totales: totales.recordset[0],
    paginacion: {
      pagina,
      porPagina,
      totalRows: totalRows.recordset[0].n,
      totalPages: Math.ceil(totalRows.recordset[0].n / porPagina),
    },
  });
}

async function cancelar(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query("UPDATE ventas SET estado='cancelada' WHERE id=@id");
  res.json({ ok: true });
}

module.exports = { list, cancelar };
