const PDFDocument = require('pdfkit');
const { sql, getPool } = require('../config/db');

/** Calcula el rango de fecha/hora exacto según el tipo de corte solicitado. */
function rangoPeriodo({ tipo, fecha, horaInicio, horaFinal }) {
  const base = fecha ? new Date(`${fecha}T00:00:00`) : new Date();
  let fi;
  let ff;

  if (tipo === 'dia') {
    fi = new Date(base); fi.setHours(0, 0, 0, 0);
    ff = new Date(base); ff.setHours(23, 59, 59, 999);
  } else if (tipo === 'semana') {
    const diaSemana = base.getDay() || 7; // lunes=1 ... domingo=7
    fi = new Date(base); fi.setDate(base.getDate() - diaSemana + 1); fi.setHours(0, 0, 0, 0);
    ff = new Date(fi); ff.setDate(fi.getDate() + 6); ff.setHours(23, 59, 59, 999);
  } else if (tipo === 'mes') {
    fi = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
    ff = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    // turno: usa horaInicio/horaFinal sobre la fecha dada
    const [hI, mI] = (horaInicio || '00:00').split(':').map(Number);
    const [hF, mF] = (horaFinal || '23:59').split(':').map(Number);
    fi = new Date(base); fi.setHours(hI || 0, mI || 0, 0, 0);
    ff = new Date(base); ff.setHours(hF || 0, mF || 0, 59, 999);
  }
  return { fi, ff };
}

async function calcularTotales(pool, fi, ff) {
  const req = () => pool.request().input('fi', sql.DateTime2, fi).input('ff', sql.DateTime2, ff);

  const ventas = await req().query(`
    SELECT COUNT(*) AS num_ventas, COALESCE(SUM(total),0) AS total_ventas,
      COALESCE(SUM(CASE WHEN forma_pago='efectivo' AND tipo_venta='contado' THEN total ELSE 0 END),0) AS total_efectivo,
      COALESCE(SUM(CASE WHEN forma_pago='tarjeta' AND tipo_venta='contado' THEN total ELSE 0 END),0) AS total_tarjeta,
      COALESCE(SUM(CASE WHEN forma_pago='transferencia' AND tipo_venta='contado' THEN total ELSE 0 END),0) AS total_transferencia,
      COALESCE(SUM(CASE WHEN tipo_venta IN ('credito','a_meses') THEN total ELSE 0 END),0) AS total_credito,
      COALESCE(SUM(descuento_monto),0) AS total_descuentos
    FROM ventas WHERE created_at BETWEEN @fi AND @ff AND estado != 'cancelada'
  `);

  const costo = await req().query(`
    SELECT COALESCE(SUM(vd.costo_unitario * vd.cantidad),0) AS costo
    FROM ventas_detalle vd
    JOIN ventas v ON v.id = vd.venta_id
    WHERE v.created_at BETWEEN @fi AND @ff AND v.estado != 'cancelada'
  `);

  const gastos = await pool.request()
    .input('fi', sql.Date, fi)
    .input('ff', sql.Date, ff)
    .query(`
      SELECT COALESCE(SUM(monto),0) AS total,
             COALESCE(SUM(CASE WHEN forma_pago='efectivo' THEN monto ELSE 0 END),0) AS total_efectivo
      FROM gastos WHERE fecha BETWEEN @fi AND @ff
    `);

  const devoluciones = await req().query(`
    SELECT COALESCE(SUM(monto_total),0) AS total,
           COALESCE(SUM(CASE WHEN tipo_devolucion='reembolso' THEN monto_total ELSE 0 END),0) AS total_efectivo
    FROM devoluciones WHERE created_at BETWEEN @fi AND @ff
  `);

  // Abonos de crédito cobrados en efectivo dentro del periodo también entran/salen de la caja física
  const abonos = await req().query(`
    SELECT COALESCE(SUM(CASE WHEN forma_pago='efectivo' THEN monto ELSE 0 END),0) AS total_efectivo
    FROM pagos WHERE created_at BETWEEN @fi AND @ff
  `);

  const v = ventas.recordset[0];
  const costoVal = Number(costo.recordset[0].costo);
  const gastosVal = Number(gastos.recordset[0].total);
  const gastosEfectivoVal = Number(gastos.recordset[0].total_efectivo);
  const devolucionesVal = Number(devoluciones.recordset[0].total);
  const devolucionesEfectivoVal = Number(devoluciones.recordset[0].total_efectivo);
  const abonosEfectivoVal = Number(abonos.recordset[0].total_efectivo);
  const utilidadNeta = Number(v.total_ventas) - costoVal - gastosVal - devolucionesVal;

  return {
    num_ventas: v.num_ventas,
    total_ventas: Number(v.total_ventas),
    total_efectivo: Number(v.total_efectivo),
    total_tarjeta: Number(v.total_tarjeta),
    total_transferencia: Number(v.total_transferencia),
    total_credito: Number(v.total_credito),
    total_descuentos: Number(v.total_descuentos),
    total_gastos: gastosVal,
    gastos_efectivo: gastosEfectivoVal,
    total_devoluciones: devolucionesVal,
    devoluciones_efectivo: devolucionesEfectivoVal,
    abonos_efectivo: abonosEfectivoVal,
    costo_ventas: costoVal,
    utilidad_neta: utilidadNeta,
  };
}

/** GET /api/cortes-caja/calcular?tipo=&fecha=&horaInicio=&horaFinal= (vista previa, sin guardar) */
async function calcular(req, res) {
  const { tipo = 'dia', fecha, horaInicio, horaFinal } = req.query;
  if (tipo === 'turno' && req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo un administrador puede generar cortes por turno.' });
  }
  const { fi, ff } = rangoPeriodo({ tipo, fecha, horaInicio, horaFinal });
  const pool = await getPool();
  const totales = await calcularTotales(pool, fi, ff);

  // El fondo con el que se abre la caja es, por default, lo que se dejó guardado
  // en el corte anterior (continuidad del flujo de efectivo entre turnos/días).
  const ultimo = await pool.request().query(
    'SELECT TOP 1 efectivo_deja_caja FROM cortes_caja ORDER BY fecha_fin DESC, id DESC'
  );
  const fondoSugerido = ultimo.recordset[0] ? Number(ultimo.recordset[0].efectivo_deja_caja) : 0;

  res.json({ tipo, fecha_inicio: fi, fecha_fin: ff, fondo_inicial_sugerido: fondoSugerido, ...totales });
}

/** POST /api/cortes-caja  guarda el corte con los totales recalculados al momento de guardar */
async function guardar(req, res) {
  const {
    tipo, fecha_inicio, fecha_fin, notas = '',
    fondo_inicial = 0, efectivo_contado = 0, efectivo_deja_caja = 0,
  } = req.body;
  if (!tipo || !fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Tipo y periodo son requeridos.' });
  }
  if (tipo === 'turno' && req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo un administrador puede guardar cortes por turno.' });
  }

  const pool = await getPool();
  const fi = new Date(fecha_inicio);
  const ff = new Date(fecha_fin);
  const t = await calcularTotales(pool, fi, ff);

  // ---------- flujo de efectivo ----------
  const fondoInicialNum = parseFloat(fondo_inicial) || 0;
  const efectivoContadoNum = parseFloat(efectivo_contado) || 0;
  const efectivoDejaCajaNum = parseFloat(efectivo_deja_caja) || 0;

  const efectivoEsperado = fondoInicialNum + t.total_efectivo + t.abonos_efectivo - t.gastos_efectivo - t.devoluciones_efectivo;
  const diferenciaCaja = efectivoContadoNum - efectivoEsperado;
  const efectivoRetira = efectivoContadoNum - efectivoDejaCajaNum;

  const result = await pool.request()
    .input('tipo', sql.NVarChar, tipo)
    .input('fecha_inicio', sql.DateTime2, fi)
    .input('fecha_fin', sql.DateTime2, ff)
    .input('num_ventas', sql.Int, t.num_ventas)
    .input('total_ventas', sql.Decimal(10, 2), t.total_ventas)
    .input('total_efectivo', sql.Decimal(10, 2), t.total_efectivo)
    .input('total_tarjeta', sql.Decimal(10, 2), t.total_tarjeta)
    .input('total_transferencia', sql.Decimal(10, 2), t.total_transferencia)
    .input('total_descuentos', sql.Decimal(10, 2), t.total_descuentos)
    .input('total_gastos', sql.Decimal(10, 2), t.total_gastos)
    .input('total_devoluciones', sql.Decimal(10, 2), t.total_devoluciones)
    .input('costo_ventas', sql.Decimal(10, 2), t.costo_ventas)
    .input('utilidad_neta', sql.Decimal(10, 2), t.utilidad_neta)
    .input('fondo_inicial', sql.Decimal(10, 2), fondoInicialNum)
    .input('gastos_efectivo', sql.Decimal(10, 2), t.gastos_efectivo)
    .input('devoluciones_efectivo', sql.Decimal(10, 2), t.devoluciones_efectivo)
    .input('abonos_efectivo', sql.Decimal(10, 2), t.abonos_efectivo)
    .input('total_credito', sql.Decimal(10, 2), t.total_credito)
    .input('efectivo_esperado', sql.Decimal(10, 2), efectivoEsperado)
    .input('efectivo_contado', sql.Decimal(10, 2), efectivoContadoNum)
    .input('diferencia_caja', sql.Decimal(10, 2), diferenciaCaja)
    .input('efectivo_deja_caja', sql.Decimal(10, 2), efectivoDejaCajaNum)
    .input('efectivo_retira', sql.Decimal(10, 2), efectivoRetira)
    .input('usuario_id', sql.Int, req.user.id)
    .input('notas', sql.NVarChar, notas)
    .query(`
      INSERT INTO cortes_caja (tipo, fecha_inicio, fecha_fin, num_ventas, total_ventas, total_efectivo,
        total_tarjeta, total_transferencia, total_descuentos, total_gastos, total_devoluciones,
        costo_ventas, utilidad_neta, fondo_inicial, gastos_efectivo, devoluciones_efectivo, abonos_efectivo,
        total_credito, efectivo_esperado, efectivo_contado, diferencia_caja, efectivo_deja_caja, efectivo_retira,
        usuario_id, notas)
      OUTPUT INSERTED.id
      VALUES (@tipo, @fecha_inicio, @fecha_fin, @num_ventas, @total_ventas, @total_efectivo,
        @total_tarjeta, @total_transferencia, @total_descuentos, @total_gastos, @total_devoluciones,
        @costo_ventas, @utilidad_neta, @fondo_inicial, @gastos_efectivo, @devoluciones_efectivo, @abonos_efectivo,
        @total_credito, @efectivo_esperado, @efectivo_contado, @diferencia_caja, @efectivo_deja_caja, @efectivo_retira,
        @usuario_id, @notas)
    `);

  res.json({ ok: true, id: result.recordset[0].id });
}

/** GET /api/cortes-caja  lista de cortes guardados */
async function list(req, res) {
  const tipo = req.query.tipo || '';
  const pool = await getPool();
  const request = pool.request();
  let where = '1=1';
  if (tipo) {
    request.input('tipo', sql.NVarChar, tipo);
    where += ' AND c.tipo=@tipo';
  }
  const result = await request.query(`
    SELECT c.*, u.nombre AS usuario_nombre
    FROM cortes_caja c
    LEFT JOIN usuarios u ON u.id = c.usuario_id
    WHERE ${where}
    ORDER BY c.created_at DESC
  `);
  res.json(result.recordset);
}

async function remove(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query('DELETE FROM cortes_caja WHERE id=@id');
  res.json({ ok: true });
}

function fmtFecha(d) {
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtFechaCorta(d) {
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtMoney(n) {
  return Number(n || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

const TIPO_LABEL = { dia: 'Corte por día', turno: 'Corte por turno', semana: 'Corte por semana', mes: 'Corte por mes' };

/** GET /api/cortes-caja/:id/pdf  genera y transmite el PDF del corte */
async function pdf(req, res) {
  const id = parseInt(req.params.id, 10);
  const pool = await getPool();
  const result = await pool.request().input('id', sql.Int, id).query(`
    SELECT c.*, u.nombre AS usuario_nombre
    FROM cortes_caja c LEFT JOIN usuarios u ON u.id = c.usuario_id
    WHERE c.id=@id
  `);
  const corte = result.recordset[0];
  if (!corte) return res.status(404).json({ error: 'Corte no encontrado.' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="corte-caja-${corte.id}.pdf"`);

  const doc = new PDFDocument({ margin: 0, size: 'LETTER' });
  doc.pipe(res);

  // ---------- paleta ----------
  const tinta = '#1F3A63';
  const tintaClara = '#3D5A85';
  const cobre = '#B5651D';
  const gris = '#666666';
  const grisClaro = '#F3F1EC';
  const lineaGris = '#E2DFD6';
  const verde = '#1E7A52';
  const rojo = '#B23636';

  const pageW = doc.page.width; // 612
  const marginX = 50;
  const contentW = pageW - marginX * 2;
  const folio = `CC-${String(corte.id).padStart(6, '0')}`;

  // ---------- franja de encabezado ----------
  doc.rect(0, 0, pageW, 108).fill(tinta);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(21).text('Punto Family', marginX, 32);
  doc.font('Helvetica').fontSize(11).fillColor('#D9E1EE').text('Reporte de corte de caja', marginX, 60);

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF').text(folio, marginX, 34, { width: contentW, align: 'right' });
  doc.font('Helvetica').fontSize(9).fillColor('#D9E1EE')
    .text(TIPO_LABEL[corte.tipo] || corte.tipo.toUpperCase(), marginX, 52, { width: contentW, align: 'right' });

  let y = 130;

  // ---------- caja de datos del periodo ----------
  const infoBoxH = 62;
  doc.roundedRect(marginX, y, contentW, infoBoxH, 6).fill(grisClaro);
  const colW = contentW / 2;
  doc.fillColor(gris).font('Helvetica-Bold').fontSize(8.5)
    .text('PERIODO', marginX + 16, y + 12)
    .text('TIPO DE CORTE', marginX + colW + 16, y + 12);
  doc.fillColor('#1A1A1A').font('Helvetica').fontSize(10.5)
    .text(`${fmtFechaCorta(corte.fecha_inicio)}  →  ${fmtFechaCorta(corte.fecha_fin)}`, marginX + 16, y + 24, { width: colW - 30 })
    .text((TIPO_LABEL[corte.tipo] || corte.tipo).replace('Corte por ', '').toUpperCase(), marginX + colW + 16, y + 24, { width: colW - 30 });

  doc.fillColor(gris).font('Helvetica-Bold').fontSize(8.5)
    .text('GENERADO POR', marginX + 16, y + 40)
    .text('FECHA DE GENERACIÓN', marginX + colW + 16, y + 40);
  doc.fillColor('#1A1A1A').font('Helvetica').fontSize(10)
    .text(corte.usuario_nombre || '—', marginX + 16, y + 51, { width: colW - 30 })
    .text(fmtFecha(corte.created_at), marginX + colW + 16, y + 51, { width: colW - 30 });

  y += infoBoxH + 26;

  // ---------- tabla con secciones ----------
  function tituloSeccion(texto) {
    doc.fillColor(tinta).font('Helvetica-Bold').fontSize(12).text(texto, marginX, y);
    y += 6;
    doc.moveTo(marginX, y + 12).lineTo(marginX + contentW, y + 12).strokeColor(tinta).lineWidth(1.4).stroke();
    y += 20;
  }

  function fila(label, valor, opts = {}) {
    const { destacado = false, franja = false, color = '#1A1A1A' } = opts;
    const rowH = destacado ? 24 : 20;
    if (franja) {
      doc.rect(marginX, y - 4, contentW, rowH).fill(grisClaro);
    }
    doc.font(destacado ? 'Helvetica-Bold' : 'Helvetica').fontSize(destacado ? 11.5 : 10.5).fillColor(color);
    doc.text(label, marginX + 12, y, { width: contentW - 160 });
    doc.text(valor, marginX, y, { width: contentW - 12, align: 'right' });
    y += rowH;
  }

  tituloSeccion('Ventas del periodo');
  fila('Número de ventas', String(corte.num_ventas), { franja: true });
  fila('Total en efectivo', fmtMoney(corte.total_efectivo));
  fila('Total con tarjeta', fmtMoney(corte.total_tarjeta), { franja: true });
  fila('Total por transferencia', fmtMoney(corte.total_transferencia));
  if (Number(corte.total_credito) > 0) {
    fila('Ventas a crédito (pendiente de cobro)', fmtMoney(corte.total_credito), { franja: true, color: cobre });
  }
  fila('Descuentos otorgados', `− ${fmtMoney(corte.total_descuentos)}`, { franja: true, color: cobre });
  y += 4;
  doc.moveTo(marginX, y - 2).lineTo(marginX + contentW, y - 2).strokeColor(lineaGris).lineWidth(0.8).stroke();
  y += 6;
  fila('Total de ventas', fmtMoney(corte.total_ventas), { destacado: true });

  y += 18;
  tituloSeccion('Egresos del periodo');
  fila('Costo de mercancía vendida', `− ${fmtMoney(corte.costo_ventas)}`, { franja: true });
  fila('Gastos del periodo', `− ${fmtMoney(corte.total_gastos)}`);
  fila('Devoluciones', `− ${fmtMoney(corte.total_devoluciones)}`, { franja: true });

  y += 22;

  // ---------- caja destacada de utilidad neta ----------
  const utilPositiva = corte.utilidad_neta >= 0;
  const utilColor = utilPositiva ? verde : rojo;
  const utilBoxH = 52;
  doc.roundedRect(marginX, y, contentW, utilBoxH, 6).fill(utilPositiva ? '#EAF5EF' : '#FBEAEA');
  doc.fillColor(utilColor).font('Helvetica-Bold').fontSize(10)
    .text('UTILIDAD NETA DEL PERIODO', marginX + 18, y + 14);
  doc.fillColor(utilColor).font('Helvetica-Bold').fontSize(19)
    .text(fmtMoney(corte.utilidad_neta), marginX, y + 12, { width: contentW - 18, align: 'right' });
  doc.fillColor(gris).font('Helvetica').fontSize(8.5)
    .text(utilPositiva ? 'Periodo con ganancia' : 'Periodo con pérdida', marginX + 18, y + 32);

  y += utilBoxH + 22;

  // ---------- control de salto de página ----------
  function checkSpace(h) {
    if (y + h > doc.page.height - 70) {
      doc.addPage();
      y = 50;
    }
  }

  // ---------- flujo de efectivo (solo si se capturó al cerrar el corte) ----------
  const huboCierreCaja = Number(corte.fondo_inicial) > 0 || Number(corte.efectivo_contado) > 0 || Number(corte.efectivo_deja_caja) > 0;

  if (huboCierreCaja) {
    checkSpace(230);
    tituloSeccion('Flujo de efectivo (caja física)');
    fila('Fondo inicial de caja', fmtMoney(corte.fondo_inicial), { franja: true });
    fila('+ Ventas cobradas en efectivo', fmtMoney(corte.total_efectivo));
    if (Number(corte.abonos_efectivo) > 0) {
      fila('+ Abonos de crédito en efectivo', fmtMoney(corte.abonos_efectivo), { franja: true });
    }
    fila('− Gastos pagados en efectivo', `− ${fmtMoney(corte.gastos_efectivo)}`, { color: cobre });
    fila('− Devoluciones pagadas en efectivo', `− ${fmtMoney(corte.devoluciones_efectivo)}`, { franja: true, color: cobre });
    y += 4;
    doc.moveTo(marginX, y - 2).lineTo(marginX + contentW, y - 2).strokeColor(lineaGris).lineWidth(0.8).stroke();
    y += 6;
    fila('Efectivo esperado en caja', fmtMoney(corte.efectivo_esperado), { destacado: true });

    y += 10;
    checkSpace(70);

    // caja de conteo físico vs esperado, con diferencia resaltada
    const diferencia = Number(corte.diferencia_caja);
    const cuadra = Math.abs(diferencia) < 0.01;
    const diferenciaColor = cuadra ? verde : (diferencia > 0 ? tintaClara : rojo);
    const countBoxH = 58;
    doc.roundedRect(marginX, y, contentW, countBoxH, 6).fill(grisClaro);
    const thirdW = contentW / 3;
    doc.fillColor(gris).font('Helvetica-Bold').fontSize(8.5)
      .text('EFECTIVO ESPERADO', marginX + 16, y + 12, { width: thirdW - 20 })
      .text('EFECTIVO CONTADO', marginX + thirdW + 16, y + 12, { width: thirdW - 20 })
      .text('DIFERENCIA', marginX + thirdW * 2 + 16, y + 12, { width: thirdW - 20 });
    doc.fillColor('#1A1A1A').font('Helvetica-Bold').fontSize(13)
      .text(fmtMoney(corte.efectivo_esperado), marginX + 16, y + 26, { width: thirdW - 20 })
      .text(fmtMoney(corte.efectivo_contado), marginX + thirdW + 16, y + 26, { width: thirdW - 20 });
    doc.fillColor(diferenciaColor).font('Helvetica-Bold').fontSize(13)
      .text(cuadra ? 'Cuadra' : fmtMoney(diferencia), marginX + thirdW * 2 + 16, y + 26, { width: thirdW - 20 });
    doc.fillColor(gris).font('Helvetica').fontSize(7.5)
      .text(cuadra ? 'Sin diferencia' : (diferencia > 0 ? 'Sobrante en caja' : 'Faltante en caja'), marginX + thirdW * 2 + 16, y + 42, { width: thirdW - 20 });

    y += countBoxH + 20;
    checkSpace(60);

    // caja de "se deja en caja" vs "se retira / deposita"
    const splitBoxH = 50;
    const halfW = (contentW - 12) / 2;
    doc.roundedRect(marginX, y, halfW, splitBoxH, 6).fill('#EAF1F8');
    doc.fillColor(tinta).font('Helvetica-Bold').fontSize(8.5).text('SE DEJA EN CAJA (siguiente turno)', marginX + 14, y + 12, { width: halfW - 24 });
    doc.fillColor(tinta).font('Helvetica-Bold').fontSize(15).text(fmtMoney(corte.efectivo_deja_caja), marginX + 14, y + 26, { width: halfW - 24 });

    doc.roundedRect(marginX + halfW + 12, y, halfW, splitBoxH, 6).fill('#F3EEE3');
    doc.fillColor(cobre).font('Helvetica-Bold').fontSize(8.5).text('SE RETIRA / DEPOSITA', marginX + halfW + 26, y + 12, { width: halfW - 24 });
    doc.fillColor(cobre).font('Helvetica-Bold').fontSize(15).text(fmtMoney(corte.efectivo_retira), marginX + halfW + 26, y + 26, { width: halfW - 24 });

    y += splitBoxH + 22;
  }

  // ---------- notas ----------
  if (corte.notas) {
    checkSpace(60);
    doc.fillColor(tinta).font('Helvetica-Bold').fontSize(11).text('Notas del corte', marginX, y);
    y += 16;
    doc.fillColor('#333333').font('Helvetica').fontSize(9.5).text(corte.notas, marginX, y, { width: contentW });
    y = doc.y + 10;
  }

  // ---------- pie de página ----------
  const footerY = doc.page.height - 46;
  doc.moveTo(marginX, footerY).lineTo(marginX + contentW, footerY).strokeColor(lineaGris).lineWidth(0.8).stroke();
  doc.fillColor('#999999').font('Helvetica').fontSize(8)
    .text(`Documento generado automáticamente el ${fmtFecha(new Date())} · Folio ${folio}`, marginX, footerY + 8, { width: contentW, align: 'center' });

  doc.end();
}

module.exports = { calcular, guardar, list, remove, pdf };
