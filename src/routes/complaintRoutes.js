const express = require('express');
const router = express.Router();

const complaints = require('../controllers/complaintController');
const { authenticate, authorize } = require('../middleware/auth');
const {
    createComplaintValidators,
    listComplaintsValidators,
    complaintIdParamValidators,
} = require('../middleware/validators');

router.post('/', authenticate, authorize('STUDENT', 'SUPERVISOR', 'ADMIN'), createComplaintValidators, complaints.createComplaint);
router.get('/', authenticate, listComplaintsValidators, complaints.getComplaints);
router.get('/:id', authenticate, complaintIdParamValidators, complaints.getComplaintById);
router.get('/:id/logs', authenticate, complaintIdParamValidators, complaints.getComplaintLogs);

module.exports = router;
