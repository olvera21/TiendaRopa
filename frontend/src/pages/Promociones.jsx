import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Power, Search, X, Tag, ShoppingBag } from 'lucide-react';
import api from '../api/client';
import { Spinner, EmptyState, Modal, Badge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = {
  id: null, nombre: '', codigo: '', tipo: 'porcentaje', valor: '', departamento: '',
  categoria_id: '', producto_id: '', talla_id: '', fecha_inicio: '', fecha_fin: '', activo: true,
};

export default function Promociones() {
  const toast = useToast();
  const { user } = useAuth();
  const esAdmin = user?.rol === 'admin';
  const [data, setData] = useState({ categorias: [], productos: [], promociones: [] });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Buscador de producto/talla para el objetivo de la promoción
  const [busquedaProd, setBusquedaProd] = useState('');
  const [productoSel, setProductoSel] = useState(null); // producto elegido (objeto con .tallas)

  function load() {
    setLoading(true);
    api.get('/promociones').then((r) => setData(r.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openNew() {
    setForm(emptyForm);
    setBusquedaProd('');
    setProductoSel(null);
    setModalOpen(true);
  }

  function openEdit(p) {
    setForm({
      ...p, categoria_id: p.categoria_id || '', producto_id: p.producto_id || '', talla_id: p.talla_id || '',
      fecha_inicio: p.fecha_inicio?.slice(0, 10) || '', fecha_fin: p.fecha_fin?.slice(0, 10) || '',
    });
    setBusquedaProd('');
    setProductoSel(p.producto_id ? data.productos.find((pr) => pr.id === p.producto_id) || null : null);
    setModalOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/promociones', form);
      toast.success(data.msg);
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id) { await api.patch(`/promociones/${id}/toggle`); load(); }
  async function remove(id) {
    if (!confirm('¿Eliminar esta promoción?')) return;
    await api.delete(`/promociones/${id}`);
    toast.success('Promoción eliminada.');
    load();
  }

  // Resultados del buscador de producto: por nombre, SKU o talla exacta
  const resultadosProd = useMemo(() => {
    const q = busquedaProd.trim().toLowerCase();
    if (!q) return [];
    return data.productos
      .filter((p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        p.tallas.some((t) => t.talla.toLowerCase() === q || t.talla.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [busquedaProd, data.productos]);

  function elegirProducto(p) {
    setProductoSel(p);
    setForm((f) => ({ ...f, producto_id: p.id, talla_id: '', categoria_id: '' }));
    setBusquedaProd('');
  }
  function elegirTalla(t) {
    setForm((f) => ({ ...f, talla_id: t.id }));
  }
  function quitarObjetivoProducto() {
    setProductoSel(null);
    setForm((f) => ({ ...f, producto_id: '', talla_id: '' }));
  }

  function descripcionObjetivo(p) {
    if (p.talla_nombre) return `Producto: ${p.prod_nombre} · Talla ${p.talla_nombre}`;
    if (p.prod_nombre) return `Producto: ${p.prod_nombre} (todas las tallas)`;
    if (p.cat_nombre) return `Categoría: ${p.cat_nombre}`;
    if (p.departamento) return `Depto: ${p.departamento}`;
    return 'General (todo el catálogo)';
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Promociones</h1>
          <p className="text-ink-900/50 text-sm">Descuentos por producto, talla, categoría o departamento.</p>
        </div>
        {esAdmin && <button onClick={openNew} className="btn-accent"><Plus size={16} /> Nueva promoción</button>}
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner size={26} /></div> : data.promociones.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {data.promociones.map((p) => (
            <div key={p.id} className="card p-4 flex justify-between items-start">
              <div>
                <p className="font-medium flex items-center gap-2">
                  {p.nombre}
                  {!p.activo && <Badge color="rose">Inactiva</Badge>}
                </p>
                <p className="text-sm text-copper-600 font-semibold">
                  {p.tipo === 'porcentaje' ? `${p.valor}% de descuento` : `$${p.valor} de descuento`}
                </p>
                <p className="text-xs text-ink-900/45 mt-1 flex items-center gap-1">
                  <Tag size={11} /> {descripcionObjetivo(p)}
                </p>
                {(p.fecha_inicio || p.fecha_fin) && (
                  <p className="text-xs text-ink-900/40">{p.fecha_inicio?.slice(0, 10)} → {p.fecha_fin?.slice(0, 10) || 'Sin fin'}</p>
                )}
              </div>
              {esAdmin && (
                <div className="flex gap-1">
                  <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50"><Pencil size={15} /></button>
                  <button onClick={() => toggle(p.id)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50"><Power size={15} /></button>
                  <button onClick={() => remove(p.id)} className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500"><Trash2 size={15} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Editar promoción' : 'Nueva promoción'}>
        <form onSubmit={save} className="space-y-3">
          <input required placeholder="Nombre" className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <input placeholder="Código (opcional)" className="input" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="monto">Monto fijo ($)</option>
            </select>
            <input required type="number" step="0.01" placeholder="Valor" className="input" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </div>

          <div className="rounded-lg border border-ink-900/10 p-3 bg-parchment-200/40 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-900/50 uppercase">
              <Tag size={13} /> A qué aplica la promoción
            </div>

            {productoSel ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-ink-900/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShoppingBag size={15} className="text-ink-900/30 shrink-0" />
                    <span className="text-sm font-medium truncate">{productoSel.nombre}</span>
                  </div>
                  <button type="button" onClick={quitarObjetivoProducto} className="text-ink-900/40 hover:text-rose-500 shrink-0">
                    <X size={15} />
                  </button>
                </div>

                {productoSel.tallas.length > 0 ? (
                  <div>
                    <p className="text-xs text-ink-900/50 mb-1">Elige una talla específica, o deja sin seleccionar para aplicar a todas:</p>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, talla_id: '' }))}
                        className={`px-2.5 py-1 rounded text-xs border ${!form.talla_id ? 'bg-ink-900 text-white border-ink-900' : 'border-ink-900/15 text-ink-900/60 hover:border-copper-500'}`}
                      >
                        Todas las tallas
                      </button>
                      {productoSel.tallas.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => elegirTalla(t)}
                          className={`px-2.5 py-1 rounded text-xs border ${String(form.talla_id) === String(t.id) ? 'bg-copper-600 text-white border-copper-600' : 'border-ink-900/15 text-ink-900/60 hover:border-copper-500'}`}
                        >
                          {t.talla}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-ink-900/40">Este producto no tiene tallas registradas; la promoción aplicará al producto completo.</p>
                )}
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-900/30" />
                  <input
                    className="input pl-8"
                    placeholder="Buscar producto por nombre, SKU o talla…"
                    value={busquedaProd}
                    onChange={(e) => setBusquedaProd(e.target.value)}
                  />
                </div>
                {resultadosProd.length > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1 bg-white rounded-lg border border-ink-900/10 p-1">
                    {resultadosProd.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => elegirProducto(p)}
                        className="w-full text-left px-2.5 py-1.5 rounded hover:bg-parchment-200 text-sm flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{p.nombre}</span>
                        {p.tallas.length > 0 && (
                          <span className="text-xs text-ink-900/40 shrink-0">{p.tallas.length} tallas</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-ink-900/40">
                  O deja el buscador vacío y elige abajo una categoría para aplicar la promoción a varios productos a la vez.
                </p>
                <select className="input" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                  <option value="">Sin categoría específica (general, todo el catálogo)</option>
                  {data.categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Inicio</label>
              <input type="date" className="input" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
            </div>
            <div>
              <label className="label">Fin</label>
              <input type="date" className="input" value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-accent flex-1 justify-center">{saving ? <Spinner size={16} /> : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
