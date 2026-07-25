import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import POS from './pages/POS.jsx';
import Inventario from './pages/Inventario.jsx';
import Categorias from './pages/Categorias.jsx';
import Clientes from './pages/Clientes.jsx';
import Credito from './pages/Credito.jsx';
import Devoluciones from './pages/Devoluciones.jsx';
import Gastos from './pages/Gastos.jsx';
import CorteCaja from './pages/CorteCaja.jsx';
import Promociones from './pages/Promociones.jsx';
import Reportes from './pages/Reportes.jsx';
import Usuarios from './pages/Usuarios.jsx';
import InventarioFisico from './pages/InventarioFisico.jsx';
import HistorialVentas from './pages/HistorialVentas.jsx';
import Perfil from './pages/Perfil.jsx';
import Ticket from './pages/Ticket.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/ticket/:id" element={<ProtectedRoute><Ticket /></ProtectedRoute>} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ventas" element={<ProtectedRoute modulo="ventas"><POS /></ProtectedRoute>} />
        <Route path="/inventario" element={<ProtectedRoute modulo="productos"><Inventario /></ProtectedRoute>} />
        <Route path="/categorias" element={<ProtectedRoute modulo="categorias"><Categorias /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute modulo="clientes"><Clientes /></ProtectedRoute>} />
        <Route path="/credito" element={<ProtectedRoute modulo="credito"><Credito /></ProtectedRoute>} />
        <Route path="/devoluciones" element={<ProtectedRoute modulo="devoluciones"><Devoluciones /></ProtectedRoute>} />
        <Route path="/gastos" element={<ProtectedRoute modulo="gastos"><Gastos /></ProtectedRoute>} />
        <Route path="/corte-caja" element={<ProtectedRoute modulo="corte_caja"><CorteCaja /></ProtectedRoute>} />
        <Route path="/promociones" element={<ProtectedRoute modulo="promociones"><Promociones /></ProtectedRoute>} />
        <Route path="/reportes" element={<ProtectedRoute modulo="reportes"><Reportes /></ProtectedRoute>} />
        <Route path="/inventario-fisico" element={<ProtectedRoute modulo="inventario_fisico"><InventarioFisico /></ProtectedRoute>} />
        <Route path="/historial-ventas" element={<ProtectedRoute modulo="historial_ventas"><HistorialVentas /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute modulo="usuarios"><Usuarios /></ProtectedRoute>} />
        <Route path="/perfil" element={<Perfil />} />
      </Route>
    </Routes>
  );
}
