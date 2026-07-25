const router = require('express').Router();
const { requireLogin } = require('../middleware/auth');
const ctrl = require('../controllers/ticket.controller');

router.use(requireLogin);
router.get('/:id', ctrl.getTicket);

module.exports = router;
