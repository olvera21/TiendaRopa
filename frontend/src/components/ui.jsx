import { X, Loader2, Inbox } from 'lucide-react';

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm">
      <div className={`card w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-900/10 sticky top-0 bg-white rounded-t-xl2">
          <h3 className="font-display font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-ink-900/40 hover:text-ink-900">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, color = 'ink' }) {
  const colors = {
    ink: 'bg-ink-900/10 text-ink-900',
    moss: 'bg-moss-500/10 text-moss-600',
    copper: 'bg-copper-500/10 text-copper-700',
    rose: 'bg-rose-500/10 text-rose-600',
  };
  return <span className={`badge ${colors[color] || colors.ink}`}>{children}</span>;
}

export function Spinner({ size = 20 }) {
  return <Loader2 size={size} className="animate-spin text-ink-900/40" />;
}

export function EmptyState({ label = 'Sin resultados' }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-ink-900/40 gap-2">
      <Inbox size={32} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export function dateFmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTimeFmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
