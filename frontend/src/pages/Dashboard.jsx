import { useEffect, useState } from 'react';
import { TrendingUp, Users, PackageX, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../api/client';
import { money, dateTimeFmt, Spinner, Badge, EmptyState } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const COLORS = ['#C97D2E', '#1C2541', '#2F7A5C', '#C1443C'];

function Kpi({ icon: Icon, label, value, sub, color = 'ink' }) {
  const bg = {
    ink: 'bg-ink-900/5 text-ink-900',
    copper: 'bg-copper-500/10 text-copper-600',
    moss: 'bg-moss-500/10 text-moss-600',
    rose: 'bg-rose-500/10 text-rose-600',
  }[color];
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}>
        <Icon size={19} />
      </div>
      <div>
        <p className="text-xs text-ink-900/50 font-medium">{label}</p>
        <p className="font-display text-xl font-semibold">{value}</p>
        {sub && <p className="text-xs text-ink-900/40">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reportes/dashboard')
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  if (!data) return <EmptyState label="No se pudo cargar el dashboard" />;

  const deptData = (data.ventasPorDepartamento || []).map((d) => ({ name: d.departamento, total: Number(d.total) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Hola, {user?.nombre?.split(' ')[0]} 👋</h1>
        <p className="text-ink-900/50 text-sm">Aquí tienes el resumen de tu tienda hoy.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={TrendingUp} label="Ventas de hoy" value={money(data.ventasHoy?.total)} sub={`${data.ventasHoy?.num || 0} ventas`} color="copper" />
        <Kpi icon={TrendingUp} label="Ventas del mes" value={money(data.ventasMes)} color="ink" />
        <Kpi icon={Users} label="Clientes con deuda" value={data.clientesConDeuda?.num || 0} sub={money(data.clientesConDeuda?.total)} color="rose" />
        <Kpi icon={PackageX} label="Sin stock" value={data.productosSinStock || 0} sub={`${data.productosStockBajo || 0} con stock bajo`} color="moss" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display font-semibold mb-4">Ventas por departamento (mes)</h2>
          {deptData.length === 0 ? <EmptyState label="Sin ventas este mes" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={deptData} dataKey="total" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-display font-semibold mb-4">Productos más vendidos (mes)</h2>
          {(!data.topProductos || data.topProductos.length === 0) ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topProductos} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nombre" width={110} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => v} />
                <Bar dataKey="qty" fill="#C97D2E" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-display font-semibold mb-4">Últimas ventas</h2>
        {(!data.ultimasVentas || data.ultimasVentas.length === 0) ? <EmptyState /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-900/40 text-xs uppercase">
                  <th className="pb-2">Folio</th>
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Estado</th>
                  <th className="pb-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.ultimasVentas.map((v) => (
                  <tr key={v.id} className="border-t border-ink-900/5">
                    <td className="py-2 font-medium">{v.folio}</td>
                    <td className="py-2">{v.nombre ? `${v.nombre} ${v.apellido || ''}` : 'Mostrador'}</td>
                    <td className="py-2">{money(v.total)}</td>
                    <td className="py-2">
                      <Badge color={v.estado === 'pagada' ? 'moss' : v.estado === 'cancelada' ? 'rose' : 'copper'}>{v.estado}</Badge>
                    </td>
                    <td className="py-2 text-ink-900/50">{dateTimeFmt(v.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(data.productosStockBajo > 0 || data.productosSinStock > 0) && (
        <div className="card p-4 flex items-center gap-3 border-l-4 border-copper-500">
          <AlertTriangle className="text-copper-600" size={20} />
          <p className="text-sm text-ink-900/70">
            Tienes <strong>{data.productosSinStock}</strong> variantes sin stock y{' '}
            <strong>{data.productosStockBajo}</strong> con stock bajo. Revisa el módulo de Inventario.
          </p>
        </div>
      )}
    </div>
  );
}
