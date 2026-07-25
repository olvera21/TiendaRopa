import { useEffect, useState } from 'react';
import { Calculator, Save, FileDown, Trash2, Clock, Wallet } from 'lucide-react';
import api from '../api/client';
import { money, dateTimeFmt, Spinner, EmptyState, Badge } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const TIPOS = [
  { v: 'dia', label: 'Por día' },
  { v: 'turno', label: 'Por turno', soloAdmin: true },
  { v: 'semana', label: 'Por semana' },
  { v: 'mes', label: 'Por mes' },
];

function hoy() { return new Date().toISOString().slice(0, 10); }
function horaActual() { return new Date().toTimeString().slice(0, 5); }

export default function CorteCaja() {
  const toast = useToast();
  const { user } = useAuth();
  const tiposDisponibles = TIPOS.filter((t) => !t.soloAdmin || user?.rol === 'admin');
  const [tipo, setTipo] = useState('dia');
  const [fecha, setFecha] = useState(hoy());
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFinal, setHoraFinal] = useState(horaActual());
  const [notas, setNotas] = useState('');

  const [preview, setPreview] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [fondoInicial, setFondoInicial] = useState('');
  const [efectivoContado, setEfectivoContado] = useState('');
  const [efectivoDejaCaja, setEfectivoDejaCaja] = useState('');

  const [historial, setHistorial] = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [descargando, setDescargando] = useState(null);

  function loadHistorial() {
    setLoadingHist(true);
    api.get('/cortes-caja').then((r) => setHistorial(r.data)).finally(() => setLoadingHist(false));
  }
  useEffect(loadHistorial, []);

  async function calcular() {
    setCalculando(true);
    setPreview(null);
    try {
      const { data } = await api.get('/cortes-caja/calcular', {
        params: { tipo, fecha, ...(tipo === 'turno' ? { horaInicio, horaFinal } : {}) },
      });
      setPreview(data);
      setFondoInicial(String(data.fondo_inicial_sugerido ?? 0));
      setEfectivoContado('');
      setEfectivoDejaCaja('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo calcular el corte.');
    } finally {
      setCalculando(false);
    }
  }

  // Flujo de efectivo calculado en vivo (el backend recalcula y guarda los mismos valores al guardar)
  const fondoNum = parseFloat(fondoInicial) || 0;
  const efectivoEsperado = preview
    ? fondoNum + Number(preview.total_efectivo) + Number(preview.abonos_efectivo || 0) - Number(preview.gastos_efectivo) - Number(preview.devoluciones_efectivo)
    : 0;
  const contadoNum = parseFloat(efectivoContado) || 0;
  const diferenciaCaja = efectivoContado === '' ? null : contadoNum - efectivoEsperado;
  const dejaCajaNum = parseFloat(efectivoDejaCaja) || 0;
  const efectivoRetira = contadoNum - dejaCajaNum;

  async function guardar() {
    if (!preview) return;
    setGuardando(true);
    try {
      await api.post('/cortes-caja', {
        tipo: preview.tipo, fecha_inicio: preview.fecha_inicio, fecha_fin: preview.fecha_fin, notas,
        fondo_inicial: fondoNum, efectivo_contado: contadoNum, efectivo_deja_caja: dejaCajaNum,
      });
      toast.success('Corte de caja guardado.');
      setPreview(null);
      setNotas('');
      setFondoInicial(''); setEfectivoContado(''); setEfectivoDejaCaja('');
      loadHistorial();
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar el corte.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este corte de caja guardado?')) return;
    await api.delete(`/cortes-caja/${id}`);
    toast.success('Corte eliminado.');
    loadHistorial();
  }

  async function descargarPDF(id) {
    setDescargando(id);
    try {
      const res = await api.get(`/cortes-caja/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err) {
      toast.error('No se pudo generar el PDF.');
    } finally {
      setDescargando(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Corte de caja</h1>
        <p className="text-ink-900/50 text-sm">Calcula y guarda tus cortes por día, turno, semana o mes.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {tiposDisponibles.map((t) => (
            <button key={t.v} onClick={() => { setTipo(t.v); setPreview(null); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${tipo === t.v ? 'bg-ink-900 text-white' : 'bg-white border border-ink-900/10 text-ink-900/60'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-3 max-w-xl">
          <div>
            <label className="label">Fecha</label>
            <input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          {tipo === 'turno' && (
            <>
              <div>
                <label className="label">Hora inicio</label>
                <input type="time" className="input" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
              </div>
              <div>
                <label className="label">Hora fin</label>
                <input type="time" className="input" value={horaFinal} onChange={(e) => setHoraFinal(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <button onClick={calcular} disabled={calculando} className="btn-primary">
          {calculando ? <Spinner size={16} /> : <Calculator size={16} />} Calcular corte
        </button>

        {preview && (
          <div className="border-t border-ink-900/10 pt-4 space-y-4">
            <p className="text-xs text-ink-900/50 flex items-center gap-1.5">
              <Clock size={13} /> Periodo: {dateTimeFmt(preview.fecha_inicio)} → {dateTimeFmt(preview.fecha_fin)}
            </p>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="card p-3 bg-parchment-200/50">
                <p className="text-xs text-ink-900/50">Ventas</p>
                <p className="font-display text-lg font-semibold">{preview.num_ventas}</p>
              </div>
              <div className="card p-3 bg-parchment-200/50">
                <p className="text-xs text-ink-900/50">Total de ventas</p>
                <p className="font-display text-lg font-semibold">{money(preview.total_ventas)}</p>
              </div>
              <div className="card p-3 bg-parchment-200/50">
                <p className="text-xs text-ink-900/50">Utilidad neta</p>
                <p className={`font-display text-lg font-semibold ${preview.utilidad_neta >= 0 ? 'text-moss-600' : 'text-rose-600'}`}>{money(preview.utilidad_neta)}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <div className="flex justify-between border-b border-ink-900/5 py-1.5"><span className="text-ink-900/60">Efectivo</span><span>{money(preview.total_efectivo)}</span></div>
              <div className="flex justify-between border-b border-ink-900/5 py-1.5"><span className="text-ink-900/60">Tarjeta</span><span>{money(preview.total_tarjeta)}</span></div>
              <div className="flex justify-between border-b border-ink-900/5 py-1.5"><span className="text-ink-900/60">Transferencia</span><span>{money(preview.total_transferencia)}</span></div>
              {preview.total_credito > 0 && (
                <div className="flex justify-between border-b border-ink-900/5 py-1.5"><span className="text-copper-600">Ventas a crédito (pendiente de cobro)</span><span className="text-copper-600">{money(preview.total_credito)}</span></div>
              )}
              <div className="flex justify-between border-b border-ink-900/5 py-1.5"><span className="text-ink-900/60">Descuentos otorgados</span><span>-{money(preview.total_descuentos)}</span></div>
              <div className="flex justify-between border-b border-ink-900/5 py-1.5"><span className="text-ink-900/60">Costo de mercancía</span><span>-{money(preview.costo_ventas)}</span></div>
              <div className="flex justify-between border-b border-ink-900/5 py-1.5"><span className="text-ink-900/60">Gastos del periodo</span><span>-{money(preview.total_gastos)}</span></div>
              <div className="flex justify-between border-b border-ink-900/5 py-1.5"><span className="text-ink-900/60">Devoluciones</span><span>-{money(preview.total_devoluciones)}</span></div>
            </div>

            <div className="rounded-lg border border-ink-900/10 p-4 bg-parchment-200/40 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-900/50 uppercase">
                <Wallet size={13} /> Cierre de caja — flujo de efectivo
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Fondo inicial de caja</label>
                  <input type="number" step="0.01" className="input" value={fondoInicial} onChange={(e) => setFondoInicial(e.target.value)} />
                  <p className="text-[11px] text-ink-900/40 mt-0.5">Con lo que abriste (sugerido: lo que se dejó en el corte anterior).</p>
                </div>
                <div>
                  <p className="label">Efectivo esperado en caja</p>
                  <p className="input bg-white/60 font-semibold flex items-center">{money(efectivoEsperado)}</p>
                  <p className="text-[11px] text-ink-900/40 mt-0.5">Fondo inicial + ventas en efectivo − gastos y devoluciones en efectivo.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Efectivo contado (conteo físico)</label>
                  <input type="number" step="0.01" className="input" value={efectivoContado} onChange={(e) => setEfectivoContado(e.target.value)} placeholder="Cuenta el efectivo real en caja" />
                </div>
                <div>
                  <p className="label">Diferencia</p>
                  <p className={`input bg-white/60 font-semibold flex items-center ${
                    diferenciaCaja === null ? '' : Math.abs(diferenciaCaja) < 0.01 ? 'text-moss-600' : diferenciaCaja > 0 ? 'text-ink-900' : 'text-rose-600'
                  }`}>
                    {diferenciaCaja === null ? '—' : Math.abs(diferenciaCaja) < 0.01 ? 'Cuadra ✓' : `${diferenciaCaja > 0 ? 'Sobrante ' : 'Faltante '}${money(Math.abs(diferenciaCaja))}`}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Efectivo que dejas en caja (siguiente turno)</label>
                  <input type="number" step="0.01" className="input" value={efectivoDejaCaja} onChange={(e) => setEfectivoDejaCaja(e.target.value)} />
                </div>
                <div>
                  <p className="label">Efectivo a retirar / depositar</p>
                  <p className="input bg-white/60 font-semibold flex items-center text-copper-600">{money(efectivoRetira)}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Notas del corte (opcional)</label>
              <textarea className="input" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones, faltantes, sobrantes, etc." />
            </div>

            <button onClick={guardar} disabled={guardando} className="btn-accent">
              {guardando ? <Spinner size={16} /> : <Save size={16} />} Guardar corte de caja
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display font-semibold mb-3">Cortes guardados</h2>
        {loadingHist ? <div className="flex justify-center py-10"><Spinner size={24} /></div> : historial.length === 0 ? (
          <EmptyState label="Aún no has guardado ningún corte de caja" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-parchment-200/60 text-ink-900/50 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Periodo</th>
                  <th className="text-right px-4 py-3">Ventas</th>
                  <th className="text-right px-4 py-3">Utilidad</th>
                  <th className="text-right px-4 py-3">Caja</th>
                  <th className="text-left px-4 py-3">Realizado por</th>
                  <th className="text-left px-4 py-3">Guardado</th>
                  <th className="text-right px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((c) => {
                  const huboCierre = Number(c.fondo_inicial) > 0 || Number(c.efectivo_contado) > 0 || Number(c.efectivo_deja_caja) > 0;
                  const cuadra = Math.abs(Number(c.diferencia_caja)) < 0.01;
                  return (
                  <tr key={c.id} className="border-t border-ink-900/5">
                    <td className="px-4 py-3"><Badge color="ink">{c.tipo}</Badge></td>
                    <td className="px-4 py-3 text-ink-900/60 text-xs">{dateTimeFmt(c.fecha_inicio)}<br />→ {dateTimeFmt(c.fecha_fin)}</td>
                    <td className="px-4 py-3 text-right">{money(c.total_ventas)}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge color={c.utilidad_neta >= 0 ? 'moss' : 'rose'}>{money(c.utilidad_neta)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {huboCierre ? (
                        <Badge color={cuadra ? 'moss' : 'rose'}>{cuadra ? 'Cuadra' : money(c.diferencia_caja)}</Badge>
                      ) : <span className="text-ink-900/30 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">{c.usuario_nombre || '—'}</td>
                    <td className="px-4 py-3 text-ink-900/50">{dateTimeFmt(c.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => descargarPDF(c.id)} disabled={descargando === c.id} className="p-1.5 rounded hover:bg-parchment-200 text-ink-900/50" title="Descargar PDF">
                          {descargando === c.id ? <Spinner size={15} /> : <FileDown size={15} />}
                        </button>
                        <button onClick={() => eliminar(c.id)} className="p-1.5 rounded hover:bg-rose-500/10 text-rose-500"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
