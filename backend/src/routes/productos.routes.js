const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const { requirePermiso } = require('../middleware/roles');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/productos.controller');

router.use(requireLogin, requirePermiso('productos'));
router.get('/', ctrl.list);
router.get('/departamentos', ctrl.departamentos);
router.post('/', upload.single('imagen'), ctrl.save);
router.delete('/:id', ctrl.remove);
router.get('/:id/tallas', ctrl.getTallas);
router.post('/tallas', ctrl.addTalla);
router.put('/tallas/stock', ctrl.updateStock);

module.exports = router;
