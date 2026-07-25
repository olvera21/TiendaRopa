import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import api from '../api/client';
import { money, dateTimeFmt, Spinner } from '../components/ui.jsx';

export default function Ticket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/ticket/${id}`).then((r) => setData(r.data));
  }, [id]);

  if (!data) return <div className="min-h-screen flex items-center justify-center"><Spinner size={26} /></div>;
  const { venta, items } = data;

  return (
    <div className="min-h-screen bg-ink-900/5 py-8 print:bg-white print:py-0">
      <div className="max-w-sm mx-auto">
        <div className="flex justify-between mb-4 print:hidden">
          <button onClick={() => navigate(-1)} className="btn-secondary btn-sm"><ArrowLeft size={14} /> Volver</button>
          <button onClick={() => window.print()} className="btn-accent btn-sm"><Printer size={14} /> Imprimir</button>
        </div>

        <div className="card p-6 font-mono text-sm">
          <div className="text-center mb-4">
            <p className="font-display font-bold text-lg">Punto Family</p>
            <p className="text-xs text-ink-900/50">Ticket de venta</p>
          </div>

          <div className="border-t border-dashed border-ink-900/20 pt-2 mb-2 text-xs space-y-0.5">
            <p>Folio: <strong>{venta.folio}</strong></p>
            <p>Fecha: {dateTimeFmt(venta.created_at)}</p>
            <p>Vendedor: {venta.vendedor_nombre || '—'}</p>
            {venta.cliente_nombre?.trim() && <p>Cliente: {venta.cliente_nombre}</p>}
          </div>

          <div className="border-t border-dashed border-ink-900/20 pt-2 space-y-1">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between text-xs">
                <span className="flex-1">{it.cantidad}x {it.prod_nombre}{it.talla ? ` (${it.talla})` : ''}</span>
                <span>{money(it.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-ink-900/20 mt-2 pt-2 space-y-1 text-xs">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(venta.subtotal)}</span></div>
            {venta.descuento_monto > 0 && <div className="flex justify-between"><span>Descuento</span><span>-{money(venta.descuento_monto)}</span></div>}
            <div className="flex justify-between font-bold text-sm"><span>Total</span><span>{money(venta.total)}</span></div>
            <div className="flex justify-between"><span>Pagado</span><span>{money(venta.monto_pagado)}</span></div>
            {venta.saldo_pendiente > 0 && <div className="flex justify-between text-rose-600"><span>Saldo pendiente</span><span>{money(venta.saldo_pendiente)}</span></div>}
          </div>

          <p className="text-center text-xs text-ink-900/40 mt-4">¡Gracias por tu compra!</p>
        </div>
      </div>
    </div>
  );
}
