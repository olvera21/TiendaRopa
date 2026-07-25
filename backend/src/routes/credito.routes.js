const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requirePermiso } = require('../middleware/roles');
const ctrl = require('../controllers/credito.controller');

router.use(requireLogin, requirePermiso('credito'));
router.get('/', ctrl.listDeudas);
router.post('/abonar', ctrl.abonar);
router.get('/:ventaId/abonos', ctrl.historialAbonos);

module.exports = router;
