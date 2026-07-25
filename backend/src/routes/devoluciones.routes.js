const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requirePermiso } = require('../middleware/roles');
const ctrl = require('../controllers/devoluciones.controller');

router.use(requireLogin, requirePermiso('devoluciones'));
router.get('/buscar-venta', ctrl.buscarVenta);
router.get('/', ctrl.list);
router.post('/', ctrl.registrar);
router.delete('/:id', ctrl.remove);

module.exports = router;
