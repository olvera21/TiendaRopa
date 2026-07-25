const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requirePermiso } = require('../middleware/roles');
const ctrl = require('../controllers/reportes.controller');

router.use(requireLogin);
router.get('/dashboard', requirePermiso('dashboard'), ctrl.dashboard);
router.get('/', requirePermiso('reportes'), ctrl.reportes);

module.exports = router;
