const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requirePermiso } = require('../middleware/roles');
const ctrl = require('../controllers/categorias.controller');

router.use(requireLogin, requirePermiso('categorias'));
router.get('/', ctrl.list);
router.post('/', ctrl.save);
router.patch('/:id/toggle', ctrl.toggle);
router.delete('/:id', ctrl.remove);

module.exports = router;
