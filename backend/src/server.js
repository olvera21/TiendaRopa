require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim());
app.use(cors({ origin: corsOrigins.includes('*') ? '*' : corsOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ImÃ¡genes de productos servidas estÃ¡ticamente
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'punto-family-backend' }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/perfil', require('./routes/perfil.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/categorias', require('./routes/categorias.routes'));
app.use('/api/productos', require('./routes/productos.routes'));
app.use('/api/ventas', require('./routes/ventas.routes'));
app.use('/api/clientes', require('./routes/clientes.routes'));
app.use('/api/credito', require('./routes/credito.routes'));
app.use('/api/devoluciones', require('./routes/devoluciones.routes'));
app.use('/api/gastos', require('./routes/gastos.routes'));
app.use('/api/promociones', require('./routes/promociones.routes'));
app.use('/api/reportes', require('./routes/reportes.routes'));
app.use('/api/inventario-fisico', require('./routes/inventarioFisico.routes'));
app.use('/api/historial-ventas', require('./routes/historialVentas.routes'));
app.use('/api/ticket', require('./routes/ticket.routes'));
app.use('/api/cortes-caja', require('./routes/corteCaja.routes'));

// Manejador de errores centralizado (multer, validaciones, etc.)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ðŸš€ Punto Family API corriendo en http://localhost:${PORT}`);
});
