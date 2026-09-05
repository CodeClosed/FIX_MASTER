// src/routes/feedbackRoutes.js
const router = require('express').Router();
const feedback = require('../controllers/feedbackController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize('STUDENT'), feedback.submitResolutionFeedback);
module.exports = router;