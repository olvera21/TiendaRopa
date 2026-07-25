const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/usuarios.controller');

router.use(requireLogin, requireAdmin);
router.get('/', ctrl.list);
router.post('/', ctrl.save);
router.delete('/:id', ctrl.remove);

module.exports = router;
