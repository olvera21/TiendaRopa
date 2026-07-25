import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, Tags, Users, Wallet,
  Undo2, Receipt, Percent, BarChart3, ClipboardList, History,
  UserCog, UserCircle, LogOut, Store, Calculator,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, modulo: 'dashboard', end: true },
  { to: '/ventas', label: 'Punto de venta', icon: ShoppingCart, modulo: 'ventas' },
  { to: '/inventario', label: 'Inventario', icon: Package, modulo: 'productos' },
  { to: '/categorias', label: 'Categorías', icon: Tags, modulo: 'categorias' },
  { to: '/clientes', label: 'Clientes', icon: Users, modulo: 'clientes' },
  { to: '/credito', label: 'Crédito', icon: Wallet, modulo: 'credito' },
  { to: '/devoluciones', label: 'Devoluciones', icon: Undo2, modulo: 'devoluciones' },
  { to: '/gastos', label: 'Gastos', icon: Receipt, modulo: 'gastos' },
  { to: '/corte-caja', label: 'Corte de caja', icon: Calculator, modulo: 'corte_caja' },
  { to: '/promociones', label: 'Promociones', icon: Percent, modulo: 'promociones' },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, modulo: 'reportes' },
  { to: '/inventario-fisico', label: 'Inventario físico', icon: ClipboardList, modulo: 'inventario_fisico' },
  { to: '/historial-ventas', label: 'Historial de ventas', icon: History, modulo: 'historial_ventas' },
  { to: '/usuarios', label: 'Usuarios', icon: UserCog, modulo: '__admin__' },
];

export default function Layout() {
  const { user, logout, puede } = useAuth();
  const navigate = useNavigate();

  const items = NAV.filter((n) => (n.modulo === '__admin__' ? user?.rol === 'admin' : puede(n.modulo)));

  return (
    <div className="min-h-screen flex bg-parchment-100">
      <aside className="w-64 bg-ink-900 text-parchment-100 flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-copper-500 flex items-center justify-center">
            <Store size={18} className="text-white" />
          </div>
          <div>
            <p className="font-display font-semibold leading-tight">Punto Family</p>
            <p className="text-[11px] text-parchment-100/50">Punto de venta</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-copper-500 text-white' : 'text-parchment-100/70 hover:bg-white/5 hover:text-parchment-100'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <NavLink
            to="/perfil"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                isActive ? 'bg-white/10' : 'hover:bg-white/5'
              } text-parchment-100/70`
            }
          >
            <UserCircle size={17} />
            <span className="truncate">{user?.nombre || 'Mi perfil'}</span>
          </NavLink>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-parchment-100/70 hover:bg-rose-500/20 hover:text-rose-200"
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
