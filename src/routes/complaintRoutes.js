const express = require('express');
const router = express.Router();

// 1. Verify this path exactly matches your controller's location and name
const complaints = require('../controllers/complaintController');
const { authenticate, authorize } = require('../middleware/auth');

// Debugging: This should print your two functions in the terminal, not an empty object {}
console.log('Complaints controller imported as:', Object.keys(complaints));

// 2. Route definitions
router.post('/', authenticate, authorize('STUDENT', 'SUPERVISOR', 'ADMIN'), complaints.createComplaint);
router.get('/', authenticate, complaints.getComplaints);

module.exports = router;