const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requirePermiso } = require('../middleware/roles');
const ctrl = require('../controllers/inventarioFisico.controller');

router.use(requireLogin, requirePermiso('inventario_fisico'));
router.get('/productos', ctrl.productosPorDepto);
router.get('/movimientos', ctrl.movimientos);
router.post('/ajuste', ctrl.aplicarAjuste);

module.exports = router;
