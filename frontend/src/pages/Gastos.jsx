import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import api from '../api/client';
import { money, dateFmt, Spinner, EmptyState, Modal } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';

const emptyForm = { id: null, concepto: '', monto: '', categoria: 'general', forma_pago: 'efectivo', fecha: new Date().toISOString().slice(0, 10), notas: '', proveedor: '' };
const CATEGORIAS = ['general', 'renta', 'servicios', 'nomina', 'mercancia', 'mantenimiento', 'transporte', 'otros'];

export default function Gastos() {
  const toast = useToast();
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState({ gastos: [], totalesPorCategoria: [] });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.get('/gastos', { params: { mes } }).then((r) => setData(r.data)).finally(() => setLoading(false));
  }
  useEffect(load, [mes]);

  function openNew() { setForm(emptyForm); setModalOpen(true); }
  function openEdit(g) { setForm({ ...g, fecha: g.fecha?.slice(0, 10) }); setModalOpen(true); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/gastos', form);
      toast.success('Gasto guardado.');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    await api.delete(`/gastos/${id}`);
    toast.success('Gasto eliminado.');
    load();
  }

  const totalMes = data.gastos.reduce((acc, g) => acc + Number(g.monto), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Gastos</h1>
          <p className="text-ink-900/50 text-sm">Registra y controla los gastos de tu negocio.</p>
        </div>
        <button onClick={openNew} className="btn-accent"><Plus size={16} /> Nuevo gasto</button>
      </div>

      <div className="flex items-center gap-3">
        <input type="month" className="input w-44" value={mes} onChange={(e) => setMes(e.target.value)} />
        <div className="card px-4 py-2">
          <p className="text-xs text-ink-900/50">Total del mes</p>
          <p className="font-display font-semibold">{money(totalMes)}</p>
        </div>
      </div>

      {data.totalesPorCategoria.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.totalesPorCategoria.map((c) => (
            <div key={c.categoria} className="card px-3 py-1.5 text-xs">
              <span className="capitalize text-ink-900/60">{c.categoria}</span>{' '}
              <span className="font-semibold">{money(c.total)}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? <div className="flex justify-center py-16"><Spinner size={26} /></div> : data.gastos.length === 0 ? (
        <EmptyState label="Sin gastos este mes" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200/60 text-ink-900/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Concepto</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.gastos.map((g) => (
                <tr key={g.id} className="border-t border-ink-900/5">
                  <td className="px-4 py-3">
                    <p className="font-medium">{g.concepto}</p>
                    {g.proveedor && <p className="text-xs text-ink-900/40">{g.proveedor}</p>}
                  </td>
                  <td className="px-4 py-3 capitalize text-ink-900/60">{g.categoria}</td>
                  <td className="px-4 py-3 text-ink-900/50">{dateFmt(g.fecha)}</td>
                  <td className="px-4 py-3 text-right font-medium">{money(g.monto)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(g)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50"><Pencil size={15} /></button>
                      <button onClick={() => remove(g.id)} className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Editar gasto' : 'Nuevo gasto'}>
        <form onSubmit={save} className="space-y-3">
          <input required placeholder="Concepto" className="input" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input required type="number" step="0.01" placeholder="Monto" className="input" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
            <input required type="date" className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input" value={form.forma_pago} onChange={(e) => setForm({ ...form, forma_pago: e.target.value })}>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          <input placeholder="Proveedor (opcional)" className="input" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} />
          <textarea placeholder="Notas" className="input" rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-accent flex-1 justify-center">{saving ? <Spinner size={16} /> : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
