import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../api/client';
import { dateTimeFmt, Spinner, EmptyState, Modal, Badge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';

const emptyForm = { id: null, nombre: '', email: '', rol: 'vendedor', activo: true, password: '' };

export default function Usuarios() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.get('/usuarios').then((r) => setUsuarios(r.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openNew() { setForm(emptyForm); setModalOpen(true); }
  function openEdit(u) { setForm({ ...u, password: '' }); setModalOpen(true); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/usuarios', form);
      toast.success(data.msg);
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('¿Desactivar este usuario?')) return;
    try {
      await api.delete(`/usuarios/${id}`);
      toast.success('Usuario desactivado.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo desactivar.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Usuarios</h1>
          <p className="text-ink-900/50 text-sm">Administra el acceso al sistema por rol.</p>
        </div>
        <button onClick={openNew} className="btn-accent"><Plus size={16} /> Nuevo usuario</button>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner size={26} /></div> : usuarios.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200/60 text-ink-900/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Correo</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Último acceso</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-ink-900/5">
                  <td className="px-4 py-3 font-medium">{u.nombre}</td>
                  <td className="px-4 py-3 text-ink-900/50">{u.email}</td>
                  <td className="px-4 py-3"><Badge color={u.rol === 'admin' ? 'copper' : 'ink'}>{u.rol}</Badge></td>
                  <td className="px-4 py-3 text-ink-900/40">{dateTimeFmt(u.ultimo_acceso)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50"><Pencil size={15} /></button>
                      <button onClick={() => remove(u.id)} className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Editar usuario' : 'Nuevo usuario'}>
        <form onSubmit={save} className="space-y-3">
          <input required placeholder="Nombre" className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <input required type="email" placeholder="Correo" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className="input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
            <option value="vendedor">Vendedor</option>
            <option value="admin">Administrador</option>
          </select>
          <input type="password" placeholder={form.id ? 'Nueva contraseña (opcional)' : 'Contraseña'} className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
            Activo
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-accent flex-1 justify-center">{saving ? <Spinner size={16} /> : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
