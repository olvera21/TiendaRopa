import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const ROL_PERMISOS = {
  admin: '*',
  vendedor: [
    'dashboard', 'ventas', 'clientes', 'credito', 'devoluciones',
    'ticket', 'perfil', 'gastos', 'promociones', 'corte_caja',
  ],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('pf_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pf_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => { setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('pf_token', data.token);
    localStorage.setItem('pf_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pf_token');
    localStorage.removeItem('pf_user');
    setUser(null);
  }, []);

  const puede = useCallback((modulo) => {
    if (!user) return false;
    const permisos = ROL_PERMISOS[user.rol];
    if (!permisos) return false;
    return permisos === '*' || permisos.includes(modulo);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, puede }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
