/**
 * ================================================================
 * Importa datos migrados desde MySQL (exportados como CSV) hacia
 * SQL Server, preservando los IDs originales (IDENTITY_INSERT).
 * ================================================================
 *
 * CÓMO EXPORTAR DESDE PHPMYADMIN (por cada tabla):
 *   1. Entra a phpMyAdmin -> selecciona la tabla -> pestaña "Exportar".
 *   2. Formato: CSV.
 *   3. Opciones recomendadas: "Reemplazar NULL por: " (vacío/blank),
 *      "Enclose columns" con comillas dobles, incluir nombres de columna
 *      en la primera fila (debe estar activado).
 *   4. Guarda el archivo exactamente como <tabla>.csv
 *      (ej: usuarios.csv, categorias.csv, productos.csv...)
 *      dentro de la carpeta backend/migration/csv/
 *
 * LUEGO EJECUTA:
 *   cd backend
 *   npm run migrate:import
 *
 * El script respeta el orden de dependencias (FKs) y activa
 * IDENTITY_INSERT para conservar los mismos IDs que tenías en MySQL,
 * así las relaciones (categoria_id, cliente_id, venta_id, etc.)
 * siguen apuntando correctamente.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { sql, getPool } = require('../src/config/db');

const CSV_DIR = path.join(__dirname, 'csv');

// Orden de importación: de "padres" a "hijos" según las FKs del esquema.
// type: 'int' | 'string' | 'decimal' | 'bit' | 'date' | 'datetime'
const TABLES = [
  {
    name: 'usuarios',
    columns: {
      id: 'int', nombre: 'string', email: 'string', password: 'string',
      rol: 'string', activo: 'bit', ultimo_acceso: 'datetime', created_at: 'datetime',
    },
  },
  {
    name: 'categorias',
    columns: {
      id: 'int', parent_id: 'int', nombre: 'string', descripcion: 'string',
      tipo: 'string', activo: 'bit', created_at: 'datetime',
    },
  },
  {
    name: 'productos',
    columns: {
      id: 'int', sku: 'string', codigo_barras: 'string', nombre: 'string',
      descripcion: 'string', categoria_id: 'int', departamento: 'string',
      marca: 'string', modelo: 'string', color: 'string', material: 'string',
      costo_unitario: 'decimal', precio_publico: 'decimal', imagen: 'string',
      activo: 'bit', created_at: 'datetime',
    },
  },
  {
    name: 'tallas',
    columns: {
      id: 'int', producto_id: 'int', talla: 'string', stock: 'int', stock_minimo: 'int',
    },
  },
  {
    name: 'clientes',
    columns: {
      id: 'int', nombre: 'string', apellido: 'string', telefono: 'string', email: 'string',
      calle: 'string', colonia: 'string', ciudad: 'string', estado: 'string', cp: 'string',
      rfc: 'string', saldo_deuda: 'decimal', limite_credito: 'decimal', notas: 'string',
      activo: 'bit', created_at: 'datetime',
    },
  },
  {
    name: 'ventas',
    columns: {
      id: 'int', folio: 'string', cliente_id: 'int', tipo_venta: 'string', forma_pago: 'string',
      subtotal: 'decimal', descuento_monto: 'decimal', descuento_porcentaje: 'decimal',
      total: 'decimal', monto_pagado: 'decimal', saldo_pendiente: 'decimal', estado: 'string',
      notas: 'string', usuario_id: 'int', num_meses: 'int', tasa_interes: 'decimal',
      enganche: 'decimal', cuota_mensual: 'decimal', created_at: 'datetime',
    },
  },
  {
    name: 'ventas_detalle',
    columns: {
      id: 'int', venta_id: 'int', producto_id: 'int', talla_id: 'int', cantidad: 'int',
      precio_unitario: 'decimal', costo_unitario: 'decimal', subtotal: 'decimal',
    },
  },
  {
    name: 'pagos',
    columns: {
      id: 'int', venta_id: 'int', cliente_id: 'int', monto: 'decimal', forma_pago: 'string',
      referencia: 'string', created_at: 'datetime',
    },
  },
  {
    name: 'gastos',
    columns: {
      id: 'int', concepto: 'string', monto: 'decimal', categoria: 'string', forma_pago: 'string',
      fecha: 'date', notas: 'string', proveedor: 'string', usuario_id: 'int', created_at: 'datetime',
    },
  },
  {
    name: 'devoluciones',
    columns: {
      id: 'int', venta_id: 'int', motivo: 'string', tipo_devolucion: 'string', monto_total: 'decimal',
      notas: 'string', usuario_id: 'int', estado: 'string', created_at: 'datetime',
    },
  },
  {
    name: 'devoluciones_detalle',
    columns: {
      id: 'int', devolucion_id: 'int', producto_id: 'int', talla_id: 'int', cantidad: 'int',
      precio_unitario: 'decimal',
    },
  },
  {
    name: 'promociones',
    columns: {
      id: 'int', nombre: 'string', codigo: 'string', tipo: 'string', valor: 'decimal',
      departamento: 'string', categoria_id: 'int', producto_id: 'int', fecha_inicio: 'date',
      fecha_fin: 'date', activo: 'bit', created_at: 'datetime',
    },
  },
  {
    name: 'inventario_movimientos',
    columns: {
      id: 'int', producto_id: 'int', talla_id: 'int', tipo: 'string', cantidad: 'int',
      motivo: 'string', created_at: 'datetime',
    },
  },
];

function sqlTypeFor(kind) {
  switch (kind) {
    case 'int': return sql.Int;
    case 'decimal': return sql.Decimal(10, 2);
    case 'bit': return sql.Bit;
    case 'date': return sql.Date;
    case 'datetime': return sql.DateTime2;
    default: return sql.NVarChar(sql.MAX);
  }
}

function coerce(kind, raw) {
  if (raw === undefined || raw === null || raw === '' || raw === 'NULL') return null;
  switch (kind) {
    case 'int': return parseInt(raw, 10);
    case 'decimal': return parseFloat(raw);
    case 'bit': return raw === '1' || raw === 'true' || raw === true ? 1 : 0;
    case 'date':
    case 'datetime':
      return new Date(raw);
    default:
      return String(raw);
  }
}

async function importTable(pool, table) {
  const file = path.join(CSV_DIR, `${table.name}.csv`);
  if (!fs.existsSync(file)) {
    console.log(`⏭️  ${table.name}.csv no encontrado, se omite.`);
    return;
  }

  const raw = fs.readFileSync(file, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  if (rows.length === 0) {
    console.log(`⏭️  ${table.name}: sin filas.`);
    return;
  }

  const cols = Object.keys(table.columns);
  const hasId = cols.includes('id');

  if (hasId) {
    await pool.request().query(`SET IDENTITY_INSERT ${table.name} ON`);
  }

  let ok = 0;
  for (const row of rows) {
    const request = pool.request();
    const usable = cols.filter((c) => c in row);
    for (const col of usable) {
      request.input(col, sqlTypeFor(table.columns[col]), coerce(table.columns[col], row[col]));
    }
    const colList = usable.join(', ');
    const valList = usable.map((c) => `@${c}`).join(', ');
    try {
      await request.query(`INSERT INTO ${table.name} (${colList}) VALUES (${valList})`);
      ok += 1;
    } catch (err) {
      console.error(`   ⚠️  Error insertando fila en ${table.name} (id=${row.id ?? '?'}): ${err.message}`);
    }
  }

  if (hasId) {
    await pool.request().query(`SET IDENTITY_INSERT ${table.name} OFF`);
  }

  console.log(`✅ ${table.name}: ${ok}/${rows.length} filas importadas.`);
}

async function main() {
  if (!fs.existsSync(CSV_DIR)) {
    console.error(`❌ No existe la carpeta ${CSV_DIR}. Crea 'backend/migration/csv/' y coloca ahí tus archivos exportados.`);
    process.exit(1);
  }

  const pool = await getPool();
  for (const table of TABLES) {
    // eslint-disable-next-line no-await-in-loop
    await importTable(pool, table);
  }
  console.log('🎉 Migración de datos completada.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error en la migración:', err);
  process.exit(1);
});
