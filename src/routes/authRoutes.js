const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { optionalAuthenticate } = require('../middleware/auth');
const { registerValidators, loginValidators } = require('../middleware/validators');

// optionalAuthenticate: register is publicly reachable (student self-signup),
// but if the caller DOES send a valid ADMIN token, the controller allows them
// to set a role other than STUDENT. See authController.register.
router.post('/register', optionalAuthenticate, registerValidators, auth.register);
router.post('/login', loginValidators, auth.login);

module.exports = router;
