import { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import api from '../api/client';
import { Spinner, EmptyState, Badge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function InventarioFisico() {
  const toast = useToast();
  const dept = 'ropa';
  const [items, setItems] = useState([]);
  const [conteos, setConteos] = useState({});
  const [loading, setLoading] = useState(true);
  const [aplicando, setAplicando] = useState(false);

  function load() {
    setLoading(true);
    api.get('/inventario-fisico/productos', { params: { dept } })
      .then((r) => { setItems(r.data); setConteos({}); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function setConteo(tallaId, value) {
    setConteos((c) => ({ ...c, [tallaId]: value }));
  }

  async function aplicarAjustes() {
    const ajustes = items
      .filter((i) => conteos[i.talla_id] !== undefined && conteos[i.talla_id] !== '')
      .map((i) => ({ talla_id: i.talla_id, prod_id: i.prod_id, stock_sistema: i.stock_sistema, stock_fisico: parseInt(conteos[i.talla_id], 10) }));

    if (ajustes.length === 0) return toast.error('Captura al menos un conteo distinto.');

    setAplicando(true);
    try {
      const { data } = await api.post('/inventario-fisico/ajuste', { ajustes, motivo: `Conteo físico ${dept}` });
      toast.success(`${data.ajustados} ajustes aplicados.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al aplicar ajustes.');
    } finally {
      setAplicando(false);
    }
  }

  const pendientes = Object.values(conteos).filter((v) => v !== '' && v !== undefined).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Inventario físico</h1>
          <p className="text-ink-900/50 text-sm">Captura el conteo real y aplica los ajustes al sistema.</p>
        </div>
        <button onClick={aplicarAjustes} disabled={aplicando || pendientes === 0} className="btn-accent">
          <ClipboardCheck size={16} /> Aplicar ajustes {pendientes > 0 ? `(${pendientes})` : ''}
        </button>
      </div>

      {loading ? <div className="flex justify-center py-16"><Spinner size={26} /></div> : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-parchment-200/60 text-ink-900/50 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Producto</th>
                <th className="text-left px-4 py-3">Talla</th>
                <th className="text-right px-4 py-3">Stock sistema</th>
                <th className="text-right px-4 py-3">Conteo físico</th>
                <th className="text-right px-4 py-3">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const val = conteos[i.talla_id];
                const diff = val !== undefined && val !== '' ? parseInt(val, 10) - i.stock_sistema : null;
                return (
                  <tr key={i.talla_id} className="border-t border-ink-900/5">
                    <td className="px-4 py-3">{i.nombre} <span className="text-ink-900/40">({i.sku})</span></td>
                    <td className="px-4 py-3">{i.talla}</td>
                    <td className="px-4 py-3 text-right">{i.stock_sistema}</td>
                    <td className="px-4 py-3 text-right">
                      <input type="number" className="input w-24 text-right" value={val ?? ''} onChange={(e) => setConteo(i.talla_id, e.target.value)} placeholder={String(i.stock_sistema)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {diff !== null && diff !== 0 && <Badge color={diff > 0 ? 'moss' : 'rose'}>{diff > 0 ? `+${diff}` : diff}</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
