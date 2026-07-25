import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Power } from 'lucide-react';
import api from '../api/client';
import { Spinner, EmptyState, Modal, Badge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';

const emptyForm = { id: null, nombre: '', parent_id: '', descripcion: '', tipo: 'ropa' };

export default function Categorias() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.get('/categorias').then((r) => setData(r.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openNew(parentId = '') {
    setForm({ ...emptyForm, parent_id: parentId });
    setModalOpen(true);
  }
  function openEdit(cat) {
    setForm({ id: cat.id, nombre: cat.nombre, parent_id: cat.parent_id || '', descripcion: cat.descripcion || '', tipo: cat.tipo || 'ropa' });
    setModalOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/categorias', { ...form, parent_id: form.parent_id || null });
      toast.success(data.msg);
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id) {
    await api.patch(`/categorias/${id}/toggle`);
    load();
  }

  async function remove(id) {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await api.delete(`/categorias/${id}`);
      toast.success('Categoría eliminada.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo eliminar.');
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size={26} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Categorías</h1>
          <p className="text-ink-900/50 text-sm">Organiza tus productos en categorías y subcategorías.</p>
        </div>
        <button onClick={() => openNew()} className="btn-accent"><Plus size={16} /> Nueva categoría</button>
      </div>

      <div className="card">
        <div className="px-5 py-3 border-b border-ink-900/5 font-display font-semibold">Categorías principales</div>
        {data.principales.length === 0 ? <EmptyState /> : (
          <div className="divide-y divide-ink-900/5">
            {data.principales.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {c.nombre}
                    {!c.activo && <Badge color="rose">Inactiva</Badge>}
                  </p>
                  <p className="text-xs text-ink-900/45">{c.num_productos} productos · {c.num_subcats} subcategorías</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openNew(c.id)} className="btn-secondary btn-sm">+ Sub</button>
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50"><Pencil size={15} /></button>
                  <button onClick={() => toggle(c.id)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50"><Power size={15} /></button>
                  <button onClick={() => remove(c.id)} className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="px-5 py-3 border-b border-ink-900/5 font-display font-semibold">Subcategorías</div>
        {data.subcategorias.length === 0 ? <EmptyState /> : (
          <div className="divide-y divide-ink-900/5">
            {data.subcategorias.map((c) => (
              <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {c.nombre}
                    {!c.activo && <Badge color="rose">Inactiva</Badge>}
                  </p>
                  <p className="text-xs text-ink-900/45">De: {c.nombre_padre} · {c.num_productos} productos</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50"><Pencil size={15} /></button>
                  <button onClick={() => toggle(c.id)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50"><Power size={15} /></button>
                  <button onClick={() => remove(c.id)} className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Editar categoría' : 'Nueva categoría'}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">Nombre</label>
            <input required className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <label className="label">Categoría padre (opcional)</label>
            <select className="input" value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
              <option value="">Ninguna (categoría principal)</option>
              {data.opcionesPadre.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea className="input" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
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
