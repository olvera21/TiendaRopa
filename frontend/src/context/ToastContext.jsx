import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((msg, type = 'info') => {
    const id = ++idCounter;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const toast = {
    success: (msg) => push(msg, 'success'),
    error: (msg) => push(msg, 'error'),
    info: (msg) => push(msg, 'info'),
  };

  const iconFor = (type) => {
    if (type === 'success') return <CheckCircle2 size={18} className="text-moss-500" />;
    if (type === 'error') return <XCircle size={18} className="text-rose-500" />;
    return <Info size={18} className="text-ink-700" />;
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div key={t.id} className="card flex items-start gap-2 p-3 animate-in fade-in slide-in-from-bottom-2">
            {iconFor(t.type)}
            <p className="text-sm flex-1">{t.msg}</p>
            <button onClick={() => remove(t.id)} className="text-ink-900/30 hover:text-ink-900">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
