const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requirePermiso, requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/clientes.controller');

router.use(requireLogin, requirePermiso('clientes'));
router.get('/', ctrl.list);
router.post('/', ctrl.save);
router.delete('/:id', requireAdmin, ctrl.remove);
router.get('/:id/historial', ctrl.historial);

module.exports = router;
