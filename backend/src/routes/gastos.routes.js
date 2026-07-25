const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requirePermiso } = require('../middleware/roles');
const ctrl = require('../controllers/gastos.controller');

router.use(requireLogin, requirePermiso('gastos'));
router.get('/', ctrl.list);
router.post('/', ctrl.save);
router.delete('/:id', ctrl.remove);

module.exports = router;
