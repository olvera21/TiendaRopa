import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, ShoppingBag, X, Percent, PackageMinus, SlidersHorizontal } from 'lucide-react';
import api from '../api/client';
import { money, Spinner, EmptyState, Modal, Badge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';

const IVA_DEFAULT = 16;

const emptyForm = {
  id: null, nombre: '', descripcion: '', categoria_id: '', departamento: 'ropa',
  marca: '', modelo: '', color: '', material: '', costo_unitario: '', precio_publico: '',
  aplica_iva: false, iva_porcentaje: IVA_DEFAULT, merma_porcentaje: '',
  codigo_barras: '', tallas: [{ talla: '', stock: 0 }],
};

export default function Inventario() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [imagen, setImagen] = useState(null);
  const [saving, setSaving] = useState(false);

  // Filtros y orden
  const [filtroStock, setFiltroStock] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [orden, setOrden] = useState('nombre_asc');

  // Tallas existentes al editar un producto (separado de form.tallas, que solo aplica al crear)
  const [tallasExistentes, setTallasExistentes] = useState([]);
  const [cargandoTallas, setCargandoTallas] = useState(false);
  const [guardandoTallas, setGuardandoTallas] = useState(false);
  const [nuevaTalla, setNuevaTalla] = useState({ talla: '', stock: 0 });

  function load() {
    setLoading(true);
    api.get('/productos', { params: { dept: 'ropa', q } })
      .then((r) => { setCategorias(r.data.categorias); setProductos(r.data.productos); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q]);

  function openNew() {
    setForm({ ...emptyForm, departamento: 'ropa' });
    setImagen(null);
    setModalOpen(true);
  }

  function openEdit(p) {
    setForm({
      id: p.id, nombre: p.nombre, descripcion: p.descripcion || '', categoria_id: p.categoria_id || '',
      departamento: p.departamento, marca: p.marca || '', modelo: p.modelo || '', color: p.color || '',
      material: p.material || '', costo_unitario: p.costo_unitario, precio_publico: p.precio_publico,
      aplica_iva: !!p.aplica_iva, iva_porcentaje: p.iva_porcentaje ?? IVA_DEFAULT, merma_porcentaje: p.merma_porcentaje ?? 0,
      codigo_barras: p.codigo_barras || '', tallas: [],
    });
    setImagen(null);
    setNuevaTalla({ talla: '', stock: 0 });
    cargarTallasExistentes(p.id);
    setModalOpen(true);
  }

  function cargarTallasExistentes(productoId) {
    setCargandoTallas(true);
    api.get(`/productos/${productoId}/tallas`)
      .then((r) => setTallasExistentes(r.data.map((t) => ({ ...t, stockNuevo: t.stock }))))
      .finally(() => setCargandoTallas(false));
  }

  function editarStockLocal(tallaId, valor) {
    setTallasExistentes((lista) => lista.map((t) => (t.id === tallaId ? { ...t, stockNuevo: valor } : t)));
  }

  async function guardarCambiosTallas() {
    const cambios = tallasExistentes.filter((t) => String(t.stockNuevo) !== String(t.stock));
    if (cambios.length === 0) return toast.info('No hay cambios de stock por guardar.');
    setGuardandoTallas(true);
    try {
      await Promise.all(cambios.map((t) =>
        api.put('/productos/tallas/stock', { talla_id: t.id, stock: parseInt(t.stockNuevo, 10) || 0 })
      ));
      toast.success('Stock de tallas actualizado.');
      cargarTallasExistentes(form.id);
      load();
    } catch (err) {
      toast.error('Error al actualizar el stock.');
    } finally {
      setGuardandoTallas(false);
    }
  }

  async function agregarTallaExistente() {
    if (!nuevaTalla.talla.trim()) return toast.error('Escribe el nombre de la talla.');
    try {
      await api.post('/productos/tallas', {
        producto_id: form.id, talla: nuevaTalla.talla.trim(), stock: parseInt(nuevaTalla.stock, 10) || 0,
      });
      toast.success('Talla agregada.');
      setNuevaTalla({ talla: '', stock: 0 });
      cargarTallasExistentes(form.id);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al agregar la talla.');
    }
  }

  function addTallaRow() {
    setForm((f) => ({ ...f, tallas: [...f.tallas, { talla: '', stock: 0 }] }));
  }
  function updateTallaRow(i, key, value) {
    setForm((f) => ({ ...f, tallas: f.tallas.map((t, idx) => (idx === i ? { ...t, [key]: value } : t)) }));
  }
  function removeTallaRow(i) {
    setForm((f) => ({ ...f, tallas: f.tallas.filter((_, idx) => idx !== i) }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'tallas') fd.append('tallas', JSON.stringify(v));
        else if (v !== null && v !== undefined) fd.append(k, v);
      });
      if (imagen) fd.append('imagen', imagen);
      const { data } = await api.post('/productos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(data.msg || 'Guardado.');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar producto.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('¿Desactivar este producto?')) return;
    await api.delete(`/productos/${id}`);
    toast.success('Producto desactivado.');
    load();
  }

  const productosFiltrados = useMemo(() => {
    let lista = [...productos];

    if (filtroCategoria) {
      lista = lista.filter((p) => String(p.categoria_id) === String(filtroCategoria));
    }
    if (filtroStock === 'sin_stock') lista = lista.filter((p) => p.stock_total === 0);
    else if (filtroStock === 'bajo') lista = lista.filter((p) => p.stock_total > 0 && p.stock_total <= 3);
    else if (filtroStock === 'disponible') lista = lista.filter((p) => p.stock_total > 3);

    const [campo, dir] = orden.split('_');
    lista.sort((a, b) => {
      let va, vb;
      if (campo === 'nombre') { va = a.nombre.toLowerCase(); vb = b.nombre.toLowerCase(); }
      else if (campo === 'precio') { va = Number(a.precio_publico); vb = Number(b.precio_publico); }
      else if (campo === 'stock') { va = Number(a.stock_total); vb = Number(b.stock_total); }
      else { va = a.nombre; vb = b.nombre; }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return lista;
  }, [productos, filtroCategoria, filtroStock, orden]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Inventario</h1>
          <p className="text-ink-900/50 text-sm">Administra tus productos, tallas y existencias.</p>
        </div>
        <button onClick={openNew} className="btn-accent"><Plus size={16} /> Nuevo producto</button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/30" />
          <input className="input pl-9" placeholder="Buscar producto…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-ink-900/40 text-xs font-semibold uppercase">
          <SlidersHorizontal size={14} /> Filtros
        </div>
        <select className="input w-44" value={filtroStock} onChange={(e) => setFiltroStock(e.target.value)}>
          <option value="">Todo el stock</option>
          <option value="sin_stock">Sin stock</option>
          <option value="bajo">Stock bajo (≤3)</option>
          <option value="disponible">Disponible (&gt;3)</option>
        </select>
        <select className="input w-48" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className="input w-52" value={orden} onChange={(e) => setOrden(e.target.value)}>
          <option value="nombre_asc">Nombre (A-Z)</option>
          <option value="nombre_desc">Nombre (Z-A)</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
          <option value="stock_asc">Stock: menor a mayor</option>
          <option value="stock_desc">Stock: mayor a menor</option>
        </select>
        <span className="text-xs text-ink-900/40 ml-auto">{productosFiltrados.length} de {productos.length} productos</span>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner size={26} /></div> : productosFiltrados.length === 0 ? (
        <EmptyState label="No hay productos con estos filtros" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200/60 text-ink-900/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Producto</th>
                <th className="text-left px-4 py-3">SKU</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-right px-4 py-3">Costo</th>
                <th className="text-right px-4 py-3">Precio</th>
                <th className="text-center px-4 py-3">Stock</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((p) => (
                <tr key={p.id} className="border-t border-ink-900/5">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-parchment-200 flex items-center justify-center overflow-hidden shrink-0">
                      {p.imagen ? <img src={`/uploads/${p.imagen}`} className="w-full h-full object-cover" /> : <ShoppingBag size={16} className="text-ink-900/20" />}
                    </div>
                    <span className="font-medium">{p.nombre}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-900/50">{p.sku}</td>
                  <td className="px-4 py-3 text-ink-900/50">{p.cat_nombre || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {money(p.costo_unitario)}
                    {p.merma_porcentaje > 0 && (
                      <span className="block text-[10px] text-copper-600">merma {p.merma_porcentaje}%</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {money(p.precio_publico)}
                    {p.aplica_iva ? (
                      <span className="block text-[10px] text-ink-900/40 font-normal">+ IVA {p.iva_porcentaje}%</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge color={p.stock_total === 0 ? 'rose' : p.stock_total <= 3 ? 'copper' : 'moss'}>{p.stock_total}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50"><Pencil size={15} /></button>
                      <button onClick={() => remove(p.id)} className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Editar producto' : 'Nuevo producto'} width="max-w-2xl">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Nombre</label>
              <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Categoría</label>
              <select className="input" value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Marca</label>
              <input className="input" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            </div>
            <div>
              <label className="label">Modelo</label>
              <input className="input" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
            </div>
            <div>
              <label className="label">Color</label>
              <input className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
            <div>
              <label className="label">Material</label>
              <input className="input" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
            </div>

            <div>
              <label className="label">Costo unitario (MXN)</label>
              <input required type="number" step="0.01" className="input" value={form.costo_unitario} onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })} />
            </div>
            <div>
              <label className="label">Precio público (MXN)</label>
              <input required type="number" step="0.01" className="input" value={form.precio_publico} onChange={(e) => setForm({ ...form, precio_publico: e.target.value })} />
            </div>

            {/* IVA */}
            <div className="col-span-2 rounded-lg border border-ink-900/10 p-3 bg-parchment-200/40 space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-ink-900/50 uppercase cursor-pointer">
                <input
                  type="checkbox" className="w-3.5 h-3.5"
                  checked={form.aplica_iva}
                  onChange={(e) => setForm({ ...form, aplica_iva: e.target.checked })}
                />
                <Percent size={13} /> Este producto aplica IVA
              </label>
              {form.aplica_iva && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number" step="0.01" placeholder="% de IVA"
                      className="input" value={form.iva_porcentaje}
                      onChange={(e) => setForm({ ...form, iva_porcentaje: e.target.value })}
                    />
                    <div />
                  </div>
                  <p className="text-xs text-ink-900/50">
                    Precio público con IVA incluido:{' '}
                    <strong className="text-ink-900">
                      {money((parseFloat(form.precio_publico) || 0) * (1 + (parseFloat(form.iva_porcentaje) || 0) / 100))}
                    </strong>
                  </p>
                </>
              )}
            </div>

            {/* Merma */}
            <div className="col-span-2 rounded-lg border border-ink-900/10 p-3 bg-parchment-200/40 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-900/50 uppercase">
                <PackageMinus size={13} /> Merma esperada (mercancía dañada o extraviada)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number" step="0.01" min="0" max="99" placeholder="% de merma"
                  className="input" value={form.merma_porcentaje}
                  onChange={(e) => setForm({ ...form, merma_porcentaje: e.target.value })}
                />
                <div />
              </div>
              {parseFloat(form.merma_porcentaje) > 0 && (
                <p className="text-xs text-ink-900/50">
                  Costo real considerando merma:{' '}
                  <strong className="text-ink-900">
                    {money((parseFloat(form.costo_unitario) || 0) / (1 - Math.min(parseFloat(form.merma_porcentaje) || 0, 99) / 100))}
                  </strong>{' '}
                  por unidad vendida.
                </p>
              )}
            </div>

            <div className="col-span-2">
              <label className="label">Código de barras</label>
              <input className="input" value={form.codigo_barras} onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="label">Imagen</label>
              <input type="file" accept="image/*" className="input" onChange={(e) => setImagen(e.target.files[0])} />
            </div>
            <div className="col-span-2">
              <label className="label">Descripción</label>
              <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
          </div>

          {!form.id ? (
            <div>
              <label className="label">Tallas / variantes iniciales</label>
              <div className="space-y-2">
                {form.tallas.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <input placeholder="Talla" className="input" value={t.talla} onChange={(e) => updateTallaRow(i, 'talla', e.target.value)} />
                    <input placeholder="Stock" type="number" className="input w-28" value={t.stock} onChange={(e) => updateTallaRow(i, 'stock', e.target.value)} />
                    <button type="button" onClick={() => removeTallaRow(i)} className="p-2 text-rose-500"><X size={16} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addTallaRow} className="btn-secondary btn-sm mt-2"><Plus size={14} /> Agregar talla</button>
            </div>
          ) : (
            <div className="rounded-lg border border-ink-900/10 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="label mb-0">Tallas y existencias</label>
                <button type="button" onClick={guardarCambiosTallas} disabled={guardandoTallas} className="btn-secondary btn-sm">
                  {guardandoTallas ? <Spinner size={14} /> : 'Guardar cambios de stock'}
                </button>
              </div>

              {cargandoTallas ? (
                <div className="flex justify-center py-4"><Spinner size={20} /></div>
              ) : tallasExistentes.length === 0 ? (
                <p className="text-sm text-ink-900/40">Este producto aún no tiene tallas registradas.</p>
              ) : (
                <div className="space-y-2">
                  {tallasExistentes.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-medium">{t.talla}</span>
                      <span className="text-xs text-ink-900/40">Actual: {t.stock}</span>
                      <input
                        type="number" min="0" className="input w-24"
                        value={t.stockNuevo} onChange={(e) => editarStockLocal(t.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 border-t border-ink-900/10 pt-3">
                <input
                  placeholder="Nueva talla (ej. 26, M, Único)" className="input"
                  value={nuevaTalla.talla} onChange={(e) => setNuevaTalla((n) => ({ ...n, talla: e.target.value }))}
                />
                <input
                  type="number" min="0" placeholder="Stock" className="input w-28"
                  value={nuevaTalla.stock} onChange={(e) => setNuevaTalla((n) => ({ ...n, stock: e.target.value }))}
                />
                <button type="button" onClick={agregarTallaExistente} className="btn-secondary btn-sm shrink-0">
                  <Plus size={14} /> Agregar
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-accent flex-1 justify-center">{saving ? <Spinner size={16} /> : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
