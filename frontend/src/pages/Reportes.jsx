import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import { money, dateFmt, Spinner, EmptyState, Badge } from '../components/ui.jsx';

const PERIODOS = [
  { v: 'hoy', label: 'Hoy' },
  { v: 'semana', label: 'Esta semana' },
  { v: 'mes', label: 'Este mes' },
  { v: 'anio', label: 'Este año' },
];

export default function Reportes() {
  const [periodo, setPeriodo] = useState('mes');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/reportes', { params: { periodo } }).then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [periodo]);

  if (loading || !data) return <div className="flex justify-center py-16"><Spinner size={26} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Reportes</h1>
          <p className="text-ink-900/50 text-sm">Del {dateFmt(data.fi)} al {dateFmt(data.ff)}</p>
        </div>
        <div className="flex gap-2">
          {PERIODOS.map((p) => (
            <button key={p.v} onClick={() => setPeriodo(p.v)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${periodo === p.v ? 'bg-ink-900 text-white' : 'bg-white border border-ink-900/10 text-ink-900/60'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-ink-900/50">Ventas</p><p className="font-display text-xl font-semibold">{money(data.ventas.total)}</p><p className="text-xs text-ink-900/40">{data.ventas.num} tickets</p></div>
        <div className="card p-4"><p className="text-xs text-ink-900/50">Costo de ventas</p><p className="font-display text-xl font-semibold">{money(data.costoVentas)}</p></div>
        <div className="card p-4"><p className="text-xs text-ink-900/50">Gastos</p><p className="font-display text-xl font-semibold text-rose-600">{money(data.gastosTotal)}</p></div>
        <div className="card p-4"><p className="text-xs text-ink-900/50">Utilidad neta</p><p className={`font-display text-xl font-semibold ${data.utilidadNeta >= 0 ? 'text-moss-600' : 'text-rose-600'}`}>{money(data.utilidadNeta)}</p></div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-4">Ventas por día</h2>
        {data.porDia.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.porDia}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="dia" tickFormatter={(d) => dateFmt(d)} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(d) => dateFmt(d)} formatter={(v) => money(v)} />
              <Line type="monotone" dataKey="total" stroke="#C97D2E" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold mb-3">Por departamento</h2>
          {data.porDepartamento.length === 0 ? <EmptyState /> : (
            <div className="space-y-2">
              {data.porDepartamento.map((d) => (
                <div key={d.departamento} className="flex justify-between text-sm border-b border-ink-900/5 pb-2">
                  <span className="capitalize font-medium">{d.departamento}</span>
                  <div className="text-right">
                    <p>{money(d.total)}</p>
                    <p className="text-xs text-ink-900/40">Utilidad: {money(d.utilidad)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-display font-semibold mb-3">Top productos</h2>
          {data.topProductos.length === 0 ? <EmptyState /> : (
            <div className="space-y-2">
              {data.topProductos.map((p, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-ink-900/5 pb-2">
                  <span>{p.nombre}</span>
                  <span className="text-ink-900/50">{p.qty} u. · {money(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-3">Clientes con deuda</h2>
        {data.clientesConDeuda.length === 0 ? <EmptyState label="Sin deudas pendientes" /> : (
          <div className="grid md:grid-cols-2 gap-2">
            {data.clientesConDeuda.map((c, i) => (
              <div key={i} className="flex justify-between text-sm bg-parchment-200/50 rounded-lg px-3 py-2">
                <span>{c.nombre} {c.apellido}</span>
                <Badge color="rose">{money(c.saldo_deuda)}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
