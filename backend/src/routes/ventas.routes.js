const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requirePermiso } = require('../middleware/roles');
const ctrl = require('../controllers/ventas.controller');

router.use(requireLogin, requirePermiso('ventas'));
router.get('/buscar-producto', ctrl.buscarProducto);
router.get('/catalogo', ctrl.catalogo);
router.get('/departamentos', ctrl.departamentos);
router.get('/buscar-cliente', ctrl.buscarCliente);
router.post('/clientes', ctrl.nuevoCliente);
router.get('/promociones-activas', ctrl.promocionesActivas);
router.post('/', ctrl.procesarVenta);

module.exports = router;
