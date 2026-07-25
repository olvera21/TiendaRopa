const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requirePermiso } = require('../middleware/roles');
const ctrl = require('../controllers/historialVentas.controller');

router.use(requireLogin, requirePermiso('historial_ventas'));
router.get('/', ctrl.list);
router.patch('/:id/cancelar', ctrl.cancelar);

module.exports = router;
