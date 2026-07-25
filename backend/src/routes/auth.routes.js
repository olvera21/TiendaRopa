const router = require('express').Router();
const { login, me } = require('../controllers/auth.controller');
const { requireLogin } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', requireLogin, me);

module.exports = router;
