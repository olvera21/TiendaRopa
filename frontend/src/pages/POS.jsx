import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, UserPlus, ShoppingBag, X, Tag } from 'lucide-react';
import api, { resolveImagenUrl } from '../api/client';
import { money, Spinner, EmptyState, Modal } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function POS() {
  const toast = useToast();
  const navigate = useNavigate();

  const [departamentos, setDepartamentos] = useState([]);
  const [deptActivo, setDeptActivo] = useState('');
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]); // { key, prod_id, nombre, imagen, talla_id, talla, precio, costo, qty, stock }

  const [cliente, setCliente] = useState(null);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [resultadosCliente, setResultadosCliente] = useState([]);
  const [nuevoClienteForm, setNuevoClienteForm] = useState(null); // { nombre, telefono }

  const [tipoVenta, setTipoVenta] = useState('contado');
  const [formaPago, setFormaPago] = useState('efectivo');
  const [descuentoMonto, setDescuentoMonto] = useState(0);
  const [montoPagado, setMontoPagado] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [promociones, setPromociones] = useState([]);

  useEffect(() => {
    api.get('/ventas/departamentos').then((r) => {
      setDepartamentos(r.data);
      if (r.data.length) setDeptActivo(r.data[0]);
    });
    api.get('/ventas/promociones-activas').then((r) => setPromociones(r.data)).catch(() => setPromociones([]));
  }, []);

  // Encuentra la promociÃ³n activa mÃ¡s especÃ­fica que aplica a un Ã­tem del carrito:
  // talla exacta > producto > categorÃ­a > departamento > general (sin filtros)
  function promoParaItem(item) {
    let mejor = null;
    let mejorPrioridad = -1;
    for (const p of promociones) {
      let prioridad = -1;
      if (p.talla_id) { if (p.talla_id === item.talla_id) prioridad = 4; }
      else if (p.producto_id) { if (p.producto_id === item.prod_id) prioridad = 3; }
      else if (p.categoria_id) { if (p.categoria_id === item.categoria_id) prioridad = 2; }
      else if (p.departamento) { if (p.departamento === item.departamento) prioridad = 1; }
      else { prioridad = 0; }
      if (prioridad > mejorPrioridad) { mejorPrioridad = prioridad; mejor = p; }
    }
    return mejor;
  }

  function descuentoDeItem(item) {
    const promo = promoParaItem(item);
    if (!promo) return { promo: null, descuento: 0 };
    const importeLinea = item.precio * item.qty;
    let descuento = 0;
    if (promo.tipo === 'porcentaje') {
      descuento = importeLinea * (Number(promo.valor) / 100);
    } else {
      descuento = Math.min(Number(promo.valor) * item.qty, importeLinea);
    }
    return { promo, descuento };
  }

  useEffect(() => {
    if (!deptActivo && !busqueda) return;
    setLoading(true);
    const timeout = setTimeout(() => {
      const req = busqueda
        ? api.get('/ventas/buscar-producto', { params: { q: busqueda } })
        : api.get('/ventas/catalogo', { params: { cat: deptActivo } });
      req.then((r) => setProductos(r.data)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [deptActivo, busqueda]);

  // Agrupar filas producto+talla en productos con lista de tallas
  const catalogoAgrupado = useMemo(() => {
    const map = new Map();
    for (const row of productos) {
      if (!map.has(row.id)) {
        map.set(row.id, { ...row, tallas: [] });
      }
      if (row.talla_id) {
        map.get(row.id).tallas.push({ talla_id: row.talla_id, talla: row.talla, stock: row.stock });
      }
    }
    return Array.from(map.values());
  }, [productos]);

  function addToCart(prod, talla) {
    const key = `${prod.id}-${talla?.talla_id || 'sin-talla'}`;
    setCart((c) => {
      const existente = c.find((i) => i.key === key);
      if (existente) {
        if (talla && existente.qty + 1 > talla.stock) {
          toast.error(`Solo hay ${talla.stock} disponibles de esta talla.`);
          return c;
        }
        return c.map((i) => (i.key === key ? { ...i, qty: i.qty + 1 } : i));
      }
      if (talla && talla.stock <= 0) {
        toast.error('Sin stock disponible.');
        return c;
      }
      return [
        ...c,
        {
          key, prod_id: prod.id, nombre: prod.nombre, imagen: prod.imagen,
          talla_id: talla?.talla_id || null, talla: talla?.talla || null,
          categoria_id: prod.categoria_id || null, departamento: prod.departamento || null,
          precio: Number(prod.precio_publico), costo: Number(prod.costo_unitario),
          qty: 1, stock: talla?.stock ?? null,
        },
      ];
    });
  }

  function updateQty(key, delta) {
    setCart((c) => c.map((i) => {
      if (i.key !== key) return i;
      const nuevaQty = i.qty + delta;
      if (nuevaQty <= 0) return i;
      if (i.stock !== null && nuevaQty > i.stock) {
        toast.error(`Solo hay ${i.stock} disponibles.`);
        return i;
      }
      return { ...i, qty: nuevaQty };
    }));
  }

  function removeItem(key) {
    setCart((c) => c.filter((i) => i.key !== key));
  }

  const subtotal = cart.reduce((acc, i) => acc + i.precio * i.qty, 0);
  const descuentoPromos = cart.reduce((acc, i) => acc + descuentoDeItem(i).descuento, 0);
  const descuentoTotal = descuentoPromos + Number(descuentoMonto || 0);
  const total = Math.max(0, subtotal - descuentoTotal);
  const pagado = tipoVenta === 'contado' ? total : Number(montoPagado || 0);
  const saldo = Math.max(0, total - pagado);

  async function buscarCliente(q) {
    setBusquedaCliente(q);
    if (q.trim().length < 2) { setResultadosCliente([]); return; }
    const { data } = await api.get('/ventas/buscar-cliente', { params: { q } });
    setResultadosCliente(data);
  }

  async function crearCliente(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/ventas/clientes', nuevoClienteForm);
      setCliente(data);
      setNuevoClienteForm(null);
      setShowClienteModal(false);
      toast.success('Cliente registrado.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear cliente.');
    }
  }

  async function procesarVenta() {
    if (cart.length === 0) return toast.error('Agrega al menos un producto.');
    if (tipoVenta !== 'contado' && !cliente) return toast.error('Selecciona un cliente para crÃ©dito o pago a meses.');

    setProcesando(true);
    try {
      const { data } = await api.post('/ventas', {
        items: cart.map((i) => ({ prod_id: i.prod_id, talla_id: i.talla_id, qty: i.qty, precio: i.precio, costo: i.costo })),
        cliente_id: cliente?.id || null,
        tipo_venta: tipoVenta,
        forma_pago: formaPago,
        desc_monto: descuentoTotal,
        monto_pagado: pagado,
        notas: '',
      });
      toast.success(`Venta ${data.folio} registrada.`);
      navigate(`/ticket/${data.venta_id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo procesar la venta.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-6 h-full">
      {/* CatÃ¡logo */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-900/30" />
            <input
              className="input pl-9"
              placeholder="Buscar por nombre, SKU o cÃ³digo de barrasâ€¦"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {!busqueda && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {departamentos.map((d) => (
              <button
                key={d}
                onClick={() => setDeptActivo(d)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap capitalize ${
                  deptActivo === d ? 'bg-ink-900 text-white' : 'bg-white text-ink-900/60 border border-ink-900/10'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={26} /></div>
        ) : catalogoAgrupado.length === 0 ? (
          <EmptyState label="No se encontraron productos" />
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {catalogoAgrupado.map((prod) => (
              <div key={prod.id} className="card p-3 flex flex-col gap-2">
                <div className="aspect-square rounded-lg bg-parchment-200 overflow-hidden flex items-center justify-center">
                  {prod.imagen ? (
                    <img src={resolveImagenUrl(prod.imagen)} alt={prod.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="text-ink-900/20" size={28} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium leading-tight line-clamp-2">{prod.nombre}</p>
                  <p className="text-copper-600 font-display font-semibold">{money(prod.precio_publico)}</p>
                </div>
                {prod.tallas && prod.tallas.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {prod.tallas.map((t) => (
                      <button
                        key={t.talla_id}
                        disabled={t.stock <= 0}
                        onClick={() => addToCart(prod, t)}
                        className={`px-2 py-1 rounded text-xs border ${
                          t.stock <= 0
                            ? 'border-ink-900/10 text-ink-900/25 cursor-not-allowed line-through'
                            : 'border-ink-900/15 hover:border-copper-500 hover:text-copper-600'
                        }`}
                        title={`Stock: ${t.stock}`}
                      >
                        {t.talla}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => addToCart(prod, null)} className="btn-secondary btn-sm justify-center">
                    <Plus size={14} /> Agregar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Carrito / checkout */}
      <div className="card p-4 flex flex-col h-fit sticky top-4 max-h-[calc(100vh-2rem)]">
        <h2 className="font-display font-semibold mb-3">Venta actual</h2>

        <div className="mb-3">
          {cliente ? (
            <div className="flex items-center justify-between bg-parchment-200 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">{cliente.nombre} {cliente.apellido}</p>
                <p className="text-xs text-ink-900/50">{cliente.telefono}</p>
              </div>
              <button onClick={() => setCliente(null)} className="text-ink-900/40 hover:text-rose-500">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowClienteModal(true)} className="btn-secondary w-full justify-center btn-sm">
              <UserPlus size={14} /> {tipoVenta === 'contado' ? 'Agregar cliente (opcional)' : 'Agregar cliente (obligatorio)'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-[120px]">
          {cart.length === 0 ? (
            <EmptyState label="AÃºn no hay productos" />
          ) : (
            cart.map((item) => {
              const { promo, descuento } = descuentoDeItem(item);
              return (
                <div key={item.key} className="flex items-center gap-2 border-b border-ink-900/5 pb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.nombre}</p>
                    <p className="text-xs text-ink-900/50">{item.talla ? `Talla ${item.talla} Â· ` : ''}{money(item.precio)}</p>
                    {promo && (
                      <p className="text-xs text-moss-600 flex items-center gap-1 mt-0.5">
                        <Tag size={11} /> {promo.nombre} (-{money(descuento)})
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.key, -1)} className="w-6 h-6 rounded bg-parchment-200 flex items-center justify-center"><Minus size={12} /></button>
                    <span className="w-6 text-center text-sm">{item.qty}</span>
                    <button onClick={() => updateQty(item.key, 1)} className="w-6 h-6 rounded bg-parchment-200 flex items-center justify-center"><Plus size={12} /></button>
                  </div>
                  <button onClick={() => removeItem(item.key)} className="text-ink-900/30 hover:text-rose-500"><Trash2 size={15} /></button>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-3 space-y-2 border-t border-ink-900/10 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={tipoVenta} onChange={(e) => setTipoVenta(e.target.value)} className="input text-sm">
              <option value="contado">Contado</option>
              <option value="credito">CrÃ©dito</option>
              <option value="a_meses">A meses</option>
            </select>
            <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="input text-sm">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>

          {descuentoPromos > 0 && (
            <div className="flex items-center justify-between text-sm text-moss-600">
              <span className="flex items-center gap-1"><Tag size={12} /> Descuento por promociones</span>
              <span>-{money(descuentoPromos)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-900/50">Descuento adicional ($)</span>
            <input
              type="number"
              min="0"
              className="input w-28 text-right"
              value={descuentoMonto}
              onChange={(e) => setDescuentoMonto(e.target.value)}
            />
          </div>

          {tipoVenta !== 'contado' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-900/50">Anticipo ($)</span>
              <input
                type="number"
                min="0"
                className="input w-28 text-right"
                value={montoPagado}
                onChange={(e) => setMontoPagado(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-ink-900/60">
            <span>Subtotal</span><span>{money(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between font-display font-semibold text-lg">
            <span>Total</span><span>{money(total)}</span>
          </div>
          {tipoVenta !== 'contado' && (
            <div className="flex items-center justify-between text-sm text-rose-600">
              <span>Saldo pendiente</span><span>{money(saldo)}</span>
            </div>
          )}

          <button
            onClick={procesarVenta}
            disabled={procesando || cart.length === 0}
            className="btn-accent w-full justify-center mt-2"
          >
            {procesando ? <Spinner size={16} /> : null}
            Cobrar {money(total)}
          </button>
        </div>
      </div>

      <Modal open={showClienteModal} onClose={() => { setShowClienteModal(false); setNuevoClienteForm(null); }} title="Agregar cliente">
        {nuevoClienteForm ? (
          <form onSubmit={crearCliente} className="space-y-3">
            <div>
              <label className="label">Nombre completo</label>
              <input required autoFocus placeholder="Nombre y apellido" className="input" value={nuevoClienteForm.nombre}
                onChange={(e) => setNuevoClienteForm((f) => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="label">TelÃ©fono (opcional)</label>
              <input placeholder="10 dÃ­gitos" className="input" value={nuevoClienteForm.telefono}
                onChange={(e) => setNuevoClienteForm((f) => ({ ...f, telefono: e.target.value }))} />
            </div>
            {tipoVenta !== 'contado' && (
              <div>
                <label className="label">LÃ­mite de crÃ©dito</label>
                <input type="number" min="0" placeholder="0" className="input" value={nuevoClienteForm.limite_credito}
                  onChange={(e) => setNuevoClienteForm((f) => ({ ...f, limite_credito: e.target.value }))} />
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setNuevoClienteForm(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button type="submit" className="btn-accent flex-1 justify-center">Guardar</button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <input
              autoFocus
              placeholder="Buscar por nombre o telÃ©fonoâ€¦"
              className="input"
              value={busquedaCliente}
              onChange={(e) => buscarCliente(e.target.value)}
            />
            <div className="max-h-56 overflow-y-auto space-y-1">
              {resultadosCliente.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCliente(c); setShowClienteModal(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-parchment-200 text-sm"
                >
                  {c.nombre} {c.apellido || ''} Â· {c.telefono || 'sin telÃ©fono'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setNuevoClienteForm({ nombre: '', telefono: '', limite_credito: 0 })}
              className="btn-secondary w-full justify-center btn-sm"
            >
              <UserPlus size={14} /> Cliente nuevo
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
