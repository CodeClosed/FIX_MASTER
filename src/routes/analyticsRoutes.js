const express = require('express');
const router = express.Router();
const analytics = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/kpi', authenticate, authorize('SUPERVISOR', 'ADMIN'), analytics.getBlockSummary);
router.get('/hotspots', authenticate, authorize('SUPERVISOR', 'ADMIN'), analytics.getDefectHotspots);

module.exports = router;