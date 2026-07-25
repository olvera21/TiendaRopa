import { useEffect, useState } from 'react';
import { Search, HandCoins, History } from 'lucide-react';
import api from '../api/client';
import { money, dateFmt, dateTimeFmt, Spinner, EmptyState, Modal, Badge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Credito() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [orden, setOrden] = useState('fecha_asc');
  const [data, setData] = useState({ ventas: [], resumen: {} });
  const [loading, setLoading] = useState(true);
  const [abonoModal, setAbonoModal] = useState(null);
  const [monto, setMonto] = useState('');
  const [formaPago, setFormaPago] = useState('efectivo');
  const [saving, setSaving] = useState(false);
  const [historialVenta, setHistorialVenta] = useState(null);
  const [historialAbonos, setHistorialAbonos] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  function load() {
    setLoading(true);
    api.get('/credito', { params: { q, orden } }).then((r) => setData(r.data)).finally(() => setLoading(false));
  }
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, orden]);

  async function abonar(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/credito/abonar', {
        venta_id: abonoModal.id, cliente_id: abonoModal.cliente_id, monto, forma_pago: formaPago,
      });
      toast.success('Abono registrado.');
      setAbonoModal(null);
      setMonto('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar abono.');
    } finally {
      setSaving(false);
    }
  }

  async function verHistorial(venta) {
    setHistorialVenta(venta);
    setCargandoHistorial(true);
    try {
      const { data } = await api.get(`/credito/${venta.id}/abonos`);
      setHistorialAbonos(data);
    } finally {
      setCargandoHistorial(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Crédito</h1>
        <p className="text-ink-900/50 text-sm">Ventas con saldo pendiente y registro de abonos.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="card p-4">
          <p className="text-xs text-ink-900/50">Ventas con deuda</p>
          <p className="font-display text-xl font-semibold">{data.resumen?.num_ventas || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-900/50">Total por cobrar</p>
          <p className="font-display text-xl font-semibold text-rose-600">{money(data.resumen?.total_deuda)}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/30" />
          <input className="input pl-9" placeholder="Buscar cliente o folio…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-52" value={orden} onChange={(e) => setOrden(e.target.value)}>
          <option value="fecha_asc">Más antiguas primero</option>
          <option value="monto_desc">Mayor monto primero</option>
        </select>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner size={26} /></div> : data.ventas.length === 0 ? (
        <EmptyState label="No hay ventas con saldo pendiente" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200/60 text-ink-900/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Folio</th>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3">Pagado</th>
                <th className="text-right px-4 py-3">Saldo</th>
                <th className="text-right px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {data.ventas.map((v) => (
                <tr key={v.id} className="border-t border-ink-900/5">
                  <td className="px-4 py-3 font-medium">{v.folio}</td>
                  <td className="px-4 py-3">
                    <p>{v.cliente_nombre}</p>
                    <p className="text-xs text-ink-900/40">{v.telefono}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-900/50">{dateFmt(v.created_at)}</td>
                  <td className="px-4 py-3 text-right">{money(v.total)}</td>
                  <td className="px-4 py-3 text-right">{money(v.monto_pagado)}</td>
                  <td className="px-4 py-3 text-right"><Badge color="rose">{money(v.saldo_pendiente)}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => verHistorial(v)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50" title="Historial de abonos"><History size={15} /></button>
                      <button onClick={() => setAbonoModal(v)} className="btn-accent btn-sm"><HandCoins size={14} /> Abonar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!historialVenta} onClose={() => setHistorialVenta(null)} title={`Historial de abonos · ${historialVenta?.folio || ''}`}>
        {cargandoHistorial ? (
          <div className="flex justify-center py-8"><Spinner size={22} /></div>
        ) : historialAbonos.length === 0 ? (
          <EmptyState label="Aún no se han registrado abonos para esta venta" />
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-ink-900/50 border-b border-ink-900/10 pb-2">
              <span>Total: {money(historialVenta?.total)}</span>
              <span>Saldo actual: <strong className="text-rose-600">{money(historialVenta?.saldo_pendiente)}</strong></span>
            </div>
            {historialAbonos.map((a, i) => (
              <div key={i} className="flex justify-between items-center border-b border-ink-900/5 py-2 text-sm">
                <div>
                  <p className="font-medium">{money(a.monto)}</p>
                  <p className="text-xs text-ink-900/40">{dateTimeFmt(a.created_at)}{a.referencia ? ` · Ref: ${a.referencia}` : ''}</p>
                </div>
                <Badge color="moss">{a.forma_pago}</Badge>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={!!abonoModal} onClose={() => setAbonoModal(null)} title={`Abonar a ${abonoModal?.folio || ''}`}>
        <form onSubmit={abonar} className="space-y-3">
          <p className="text-sm text-ink-900/60">Saldo pendiente: <strong>{money(abonoModal?.saldo_pendiente)}</strong></p>
          <div>
            <label className="label">Monto a abonar</label>
            <input required type="number" step="0.01" min="0.01" max={abonoModal?.saldo_pendiente} className="input" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
          <div>
            <label className="label">Forma de pago</label>
            <select className="input" value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setAbonoModal(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-accent flex-1 justify-center">{saving ? <Spinner size={16} /> : 'Registrar abono'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
