const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const ctrl = require('../controllers/perfil.controller');

router.use(requireLogin);
router.get('/', ctrl.getPerfil);
router.put('/datos', ctrl.updateDatos);
router.put('/password', ctrl.updatePassword);

module.exports = router;
