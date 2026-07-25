import { useEffect, useState } from 'react';
import { Search, Undo2, Trash2 } from 'lucide-react';
import api from '../api/client';
import { money, dateTimeFmt, Spinner, EmptyState, Badge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Devoluciones() {
  const toast = useToast();
  const [folio, setFolio] = useState('');
  const [venta, setVenta] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [selected, setSelected] = useState({});
  const [motivo, setMotivo] = useState('');
  const [tipoDevolucion, setTipoDevolucion] = useState('reembolso');
  const [registrando, setRegistrando] = useState(false);
  const [lista, setLista] = useState([]);

  function loadLista() {
    api.get('/devoluciones').then((r) => setLista(r.data));
  }
  useEffect(loadLista, []);

  async function buscar(e) {
    e.preventDefault();
    if (!folio.trim()) return;
    setBuscando(true);
    setVenta(null);
    try {
      const { data } = await api.get('/devoluciones/buscar-venta', { params: { folio: folio.trim() } });
      setVenta(data);
      setSelected({});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Venta no encontrada.');
    } finally {
      setBuscando(false);
    }
  }

  function toggleItem(item) {
    setSelected((s) => {
      const copy = { ...s };
      if (copy[item.id]) delete copy[item.id];
      else copy[item.id] = { ...item, qty: item.cantidad };
      return copy;
    });
  }

  function setQty(id, qty, max) {
    setSelected((s) => ({ ...s, [id]: { ...s[id], qty: Math.min(Math.max(1, qty), max) } }));
  }

  async function registrar() {
    const items = Object.values(selected).map((i) => ({
      prod_id: i.producto_id, talla_id: i.talla_id, qty: i.qty, precio: i.precio_unitario,
    }));
    if (items.length === 0) return toast.error('Selecciona al menos un producto.');

    setRegistrando(true);
    try {
      const { data } = await api.post('/devoluciones', {
        venta_id: venta.id, motivo, tipo_devolucion: tipoDevolucion, items,
      });
      toast.success(`Devolución registrada por ${money(data.monto)}.`);
      setVenta(null);
      setFolio('');
      setSelected({});
      setMotivo('');
      loadLista();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo registrar la devolución.');
    } finally {
      setRegistrando(false);
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este registro de devolución?')) return;
    await api.delete(`/devoluciones/${id}`);
    toast.success('Eliminada.');
    loadLista();
  }

  const montoSeleccionado = Object.values(selected).reduce((acc, i) => acc + i.precio_unitario * i.qty, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Devoluciones</h1>
        <p className="text-ink-900/50 text-sm">Busca una venta por folio para procesar su devolución.</p>
      </div>

      <form onSubmit={buscar} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/30" />
          <input className="input pl-9" placeholder="Folio de venta (ej. V20260709AB12C)" value={folio} onChange={(e) => setFolio(e.target.value)} />
        </div>
        <button type="submit" disabled={buscando} className="btn-primary">{buscando ? <Spinner size={16} /> : 'Buscar'}</button>
      </form>

      {venta && (
        <div className="card p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-display font-semibold text-lg">{venta.folio}</p>
              <p className="text-sm text-ink-900/50">{venta.cliente_nombre?.trim() || 'Cliente mostrador'} · {dateTimeFmt(venta.created_at)}</p>
            </div>
            <Badge color={venta.estado === 'pagada' ? 'moss' : 'copper'}>{venta.estado}</Badge>
          </div>

          <div className="divide-y divide-ink-900/5">
            {venta.items.map((item) => (
              <label key={item.id} className="flex items-center gap-3 py-2 cursor-pointer">
                <input type="checkbox" checked={!!selected[item.id]} onChange={() => toggleItem(item)} className="w-4 h-4" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.prod_nombre}{item.talla ? ` · Talla ${item.talla}` : ''}</p>
                  <p className="text-xs text-ink-900/40">{item.cantidad} unidades · {money(item.precio_unitario)} c/u</p>
                </div>
                {selected[item.id] && (
                  <input
                    type="number"
                    min="1"
                    max={item.cantidad}
                    className="input w-20 text-right"
                    value={selected[item.id].qty}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setQty(item.id, parseInt(e.target.value, 10) || 1, item.cantidad)}
                  />
                )}
              </label>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={tipoDevolucion} onChange={(e) => setTipoDevolucion(e.target.value)}>
              <option value="reembolso">Reembolso</option>
              <option value="cambio">Cambio</option>
              <option value="nota_credito">Nota de crédito</option>
            </select>
            <input placeholder="Motivo (opcional)" className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>

          <div className="flex items-center justify-between border-t border-ink-900/10 pt-3">
            <p className="text-sm text-ink-900/60">Monto a devolver: <strong>{money(montoSeleccionado)}</strong></p>
            <button onClick={registrar} disabled={registrando} className="btn-danger"><Undo2 size={15} /> Registrar devolución</button>
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display font-semibold mb-3">Devoluciones recientes</h2>
        {lista.length === 0 ? <EmptyState /> : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-parchment-200/60 text-ink-900/50 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Folio</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-right px-4 py-3">Monto</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-right px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((d) => (
                  <tr key={d.id} className="border-t border-ink-900/5">
                    <td className="px-4 py-3 font-medium">{d.folio}</td>
                    <td className="px-4 py-3">{d.cliente_nombre?.trim() || 'Mostrador'}</td>
                    <td className="px-4 py-3 capitalize">{d.tipo_devolucion.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-right">{money(d.monto_total)}</td>
                    <td className="px-4 py-3 text-ink-900/50">{dateTimeFmt(d.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => eliminar(d.id)} className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
