const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requirePermiso } = require('../middleware/roles');
const ctrl = require('../controllers/corteCaja.controller');

router.use(requireLogin, requirePermiso('corte_caja'));
router.get('/calcular', ctrl.calcular);
router.get('/', ctrl.list);
router.post('/', ctrl.guardar);
router.delete('/:id', ctrl.remove);
router.get('/:id/pdf', ctrl.pdf);

module.exports = router;
