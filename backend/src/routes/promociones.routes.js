const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requirePermiso, requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/promociones.controller');

router.use(requireLogin, requirePermiso('promociones'));
router.get('/', ctrl.list);
router.post('/', requireAdmin, ctrl.save);
router.patch('/:id/toggle', requireAdmin, ctrl.toggle);
router.delete('/:id', requireAdmin, ctrl.remove);

module.exports = router;
