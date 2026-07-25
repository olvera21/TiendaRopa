import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/client';
import { money, dateTimeFmt, Spinner, EmptyState, Badge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function HistorialVentas() {
  const toast = useToast();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [tipo, setTipo] = useState('');
  const [pagina, setPagina] = useState(1);
  const [data, setData] = useState({ ventas: [], totales: {}, paginacion: {} });
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get('/historial-ventas', { params: { q, estado, tipo, p: pagina } })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q, estado, tipo, pagina]);

  async function cancelar(id) {
    if (!confirm('¿Cancelar esta venta? Esta acción no se puede deshacer.')) return;
    await api.patch(`/historial-ventas/${id}/cancelar`);
    toast.success('Venta cancelada.');
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Historial de ventas</h1>
        <p className="text-ink-900/50 text-sm">{data.totales?.num || 0} ventas · {money(data.totales?.total)} en el rango filtrado.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/30" />
          <input className="input pl-9" placeholder="Folio o cliente…" value={q} onChange={(e) => { setQ(e.target.value); setPagina(1); }} />
        </div>
        <select className="input w-44" value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1); }}>
          <option value="">Todos los estados</option>
          <option value="pagada">Pagada</option>
          <option value="pendiente">Pendiente</option>
          <option value="credito">Crédito</option>
          <option value="a_meses">A meses</option>
          <option value="cancelada">Cancelada</option>
          <option value="devuelta">Devuelta</option>
        </select>
        <select className="input w-44" value={tipo} onChange={(e) => { setTipo(e.target.value); setPagina(1); }}>
          <option value="">Todos los tipos</option>
          <option value="contado">Contado</option>
          <option value="credito">Crédito</option>
          <option value="a_meses">A meses</option>
        </select>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner size={26} /></div> : data.ventas.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-parchment-200/60 text-ink-900/50 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Folio</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.ventas.map((v) => (
                  <tr key={v.id} className="border-t border-ink-900/5">
                    <td className="px-4 py-3 font-medium">{v.folio}</td>
                    <td className="px-4 py-3">{v.cliente_nombre?.trim() || 'Mostrador'}</td>
                    <td className="px-4 py-3 capitalize text-ink-900/60">{v.tipo_venta.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-right">{money(v.total)}</td>
                    <td className="px-4 py-3">
                      <Badge color={v.estado === 'pagada' ? 'moss' : v.estado === 'cancelada' ? 'rose' : 'copper'}>{v.estado}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-900/50">{dateTimeFmt(v.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => navigate(`/ticket/${v.id}`)} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50"><Eye size={15} /></button>
                        {v.estado !== 'cancelada' && (
                          <button onClick={() => cancelar(v.id)} className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500"><Ban size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-ink-900/50">
            <span>Página {data.paginacion.pagina} de {data.paginacion.totalPages || 1}</span>
            <div className="flex gap-2">
              <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} className="btn-secondary btn-sm"><ChevronLeft size={14} /></button>
              <button disabled={pagina >= (data.paginacion.totalPages || 1)} onClick={() => setPagina((p) => p + 1)} className="btn-secondary btn-sm"><ChevronRight size={14} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
