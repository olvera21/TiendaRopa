// Equivalente a ROL_PERMISOS de config.php.
// '*' significa acceso total. Las claves son los "módulos" (usados por el
// middleware requirePermiso en las rutas).
const ROL_PERMISOS = {
  admin: '*',
  vendedor: [
    'dashboard', 'ventas', 'clientes', 'credito', 'devoluciones',
    'ticket', 'perfil', 'gastos', 'promociones', 'corte_caja',
  ],
};

function puedeVer(rol, modulo) {
  const permisos = ROL_PERMISOS[rol];
  if (!permisos) return false;
  if (permisos === '*') return true;
  return permisos.includes(modulo);
}

/** Genera un folio único de venta, ej: V20260708A1B2C */
function generateFolio() {
  const fecha = new Date();
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `V${y}${m}${d}${rand}`;
}

function formatMoney(amount) {
  const n = Number(amount || 0);
  return `$${n.toFixed(2)}`;
}

module.exports = { ROL_PERMISOS, puedeVer, generateFolio, formatMoney };
