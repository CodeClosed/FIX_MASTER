// src/routes/feedbackRoutes.js
const router = require('express').Router();
const feedback = require('../controllers/feedbackController');
const { authenticate, authorize } = require('../middleware/auth');
const { feedbackValidators } = require('../middleware/validators');

router.post('/', authenticate, authorize('STUDENT'), feedbackValidators, feedback.submitResolutionFeedback);
module.exports = router;
