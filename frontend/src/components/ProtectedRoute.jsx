import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from './ui.jsx';

export default function ProtectedRoute({ children, modulo }) {
  const { user, loading, puede } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (modulo && !puede(modulo)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <p className="font-display text-xl font-semibold mb-2">Sin acceso</p>
          <p className="text-ink-900/60">No tienes permiso para ver esta sección.</p>
        </div>
      </div>
    );
  }
  return children;
}
