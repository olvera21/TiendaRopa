import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, History } from 'lucide-react';
import api from '../api/client';
import { money, dateFmt, Spinner, EmptyState, Modal, Badge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = { id: null, nombre: '', telefono: '', limite_credito: 0, notas: '' };

export default function Clientes() {
  const toast = useToast();
  const { user } = useAuth();
  const esAdmin = user?.rol === 'admin';
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [historialCliente, setHistorialCliente] = useState(null);
  const [historial, setHistorial] = useState([]);

  function load() {
    setLoading(true);
    api.get('/clientes', { params: { q, filtro } }).then((r) => setClientes(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, filtro]);

  function openNew() { setForm(emptyForm); setModalOpen(true); }
  function openEdit(c) { setForm({ ...emptyForm, ...c }); setModalOpen(true); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/clientes', form);
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
    if (!confirm('¿Desactivar este cliente?')) return;
    await api.delete(`/clientes/${id}`);
    toast.success('Cliente desactivado.');
    load();
  }

  async function verHistorial(c) {
    setHistorialCliente(c);
    const { data } = await api.get(`/clientes/${c.id}/historial`);
    setHistorial(data);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Clientes</h1>
          <p className="text-ink-900/50 text-sm">Directorio de clientes y su historial de compras.</p>
        </div>
        <button onClick={openNew} className="btn-accent"><Plus size={16} /> Nuevo cliente</button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/30" />
          <input className="input pl-9" placeholder="Buscar cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-52" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos</option>
          <option value="con_deuda">Con deuda</option>
        </select>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner size={26} /></div> : clientes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200/60 text-ink-900/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="text-right px-4 py-3">Deuda</th>
                <th className="text-right px-4 py-3">Límite</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-t border-ink-900/5">
                  <td className="px-4 py-3 font-medium">{c.nombre} {c.apellido}</td>
                  <td className="px-4 py-3 text-ink-900/50">{c.telefono || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {c.saldo_deuda > 0 ? <Badge color="rose">{money(c.saldo_deuda)}</Badge> : <span className="text-ink-900/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-900/50">{money(c.limite_credito)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => verHistorial(c)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50"><History size={15} /></button>
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50"><Pencil size={15} /></button>
                      {esAdmin && (
                        <button onClick={() => remove(c.id)} className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500"><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Editar cliente' : 'Nuevo cliente'}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">Nombre completo</label>
            <input required placeholder="Nombre y apellido" className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input placeholder="10 dígitos" className="input" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div>
            <label className="label">Límite de crédito</label>
            <input type="number" min="0" placeholder="0" className="input" value={form.limite_credito} onChange={(e) => setForm({ ...form, limite_credito: e.target.value })} />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea placeholder="Referencias, observaciones, etc." className="input" rows={3} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-accent flex-1 justify-center">{saving ? <Spinner size={16} /> : 'Guardar'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!historialCliente} onClose={() => setHistorialCliente(null)} title={`Historial de ${historialCliente?.nombre || ''}`}>
        {historial.length === 0 ? <EmptyState label="Sin compras registradas" /> : (
          <div className="divide-y divide-ink-900/5">
            {historial.map((v, i) => (
              <div key={i} className="py-2 flex justify-between text-sm">
                <div>
                  <p className="font-medium">{v.folio}</p>
                  <p className="text-ink-900/40 text-xs">{dateFmt(v.created_at)} · {v.tipo_venta}</p>
                </div>
                <div className="text-right">
                  <p>{money(v.total)}</p>
                  <Badge color={v.estado === 'pagada' ? 'moss' : 'copper'}>{v.estado}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
