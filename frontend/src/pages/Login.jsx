import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6 text-parchment-50">
          <div className="w-12 h-12 rounded-xl2 bg-copper-500 flex items-center justify-center mb-3">
            <Store size={24} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Punto Family</h1>
          <p className="text-parchment-100/50 text-sm">Ingresa a tu punto de venta</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="bg-rose-500/10 text-rose-600 text-sm rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="label">Correo electrónico</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu-correo@tienda.com"
            />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <input
              type="password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-accent w-full justify-center">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
