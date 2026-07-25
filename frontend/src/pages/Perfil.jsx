import { useEffect, useState } from 'react';
import api from '../api/client';
import { Spinner } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Perfil() {
  const toast = useToast();
  const { user } = useAuth();
  const [datos, setDatos] = useState({ nombre: '', email: '' });
  const [pass, setPass] = useState({ actual: '', nueva: '' });
  const [loading, setLoading] = useState(true);
  const [savingDatos, setSavingDatos] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    api.get('/perfil').then((r) => setDatos({ nombre: r.data.nombre, email: r.data.email })).finally(() => setLoading(false));
  }, []);

  async function saveDatos(e) {
    e.preventDefault();
    setSavingDatos(true);
    try {
      await api.put('/perfil/datos', datos);
      toast.success('Datos actualizados.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar.');
    } finally {
      setSavingDatos(false);
    }
  }

  async function savePass(e) {
    e.preventDefault();
    setSavingPass(true);
    try {
      await api.put('/perfil/password', pass);
      toast.success('Contraseña actualizada.');
      setPass({ actual: '', nueva: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña.');
    } finally {
      setSavingPass(false);
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size={26} /></div>;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Mi perfil</h1>
        <p className="text-ink-900/50 text-sm">Rol: <span className="capitalize">{user?.rol}</span></p>
      </div>

      <form onSubmit={saveDatos} className="card p-5 space-y-3">
        <h2 className="font-display font-semibold">Datos personales</h2>
        <div>
          <label className="label">Nombre</label>
          <input required className="input" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
        </div>
        <div>
          <label className="label">Correo</label>
          <input required type="email" className="input" value={datos.email} onChange={(e) => setDatos({ ...datos, email: e.target.value })} />
        </div>
        <button type="submit" disabled={savingDatos} className="btn-accent">{savingDatos ? <Spinner size={16} /> : 'Guardar cambios'}</button>
      </form>

      <form onSubmit={savePass} className="card p-5 space-y-3">
        <h2 className="font-display font-semibold">Cambiar contraseña</h2>
        <div>
          <label className="label">Contraseña actual</label>
          <input required type="password" className="input" value={pass.actual} onChange={(e) => setPass({ ...pass, actual: e.target.value })} />
        </div>
        <div>
          <label className="label">Nueva contraseña</label>
          <input required type="password" minLength={6} className="input" value={pass.nueva} onChange={(e) => setPass({ ...pass, nueva: e.target.value })} />
        </div>
        <button type="submit" disabled={savingPass} className="btn-primary">{savingPass ? <Spinner size={16} /> : 'Actualizar contraseña'}</button>
      </form>
    </div>
  );
}
