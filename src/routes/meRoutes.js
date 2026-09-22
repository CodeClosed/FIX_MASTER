const express = require('express');
const router = express.Router();
const me = require('../controllers/meController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, me.getMe);
router.get('/allotment', authenticate, me.getMyAllotment);

module.exports = router;
