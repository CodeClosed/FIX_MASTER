const express = require('express');
const router = express.Router();
const dispatch = require('../controllers/dispatchController');
const { authenticate, authorize } = require('../middleware/auth');
const {
    assignTechnicianValidators,
    autoDispatchValidators,
    assignmentIdParamValidators,
} = require('../middleware/validators');

router.post('/assign', authenticate, authorize('SUPERVISOR', 'ADMIN'), assignTechnicianValidators, dispatch.assignTechnician);
router.post('/auto-dispatch', authenticate, authorize('SUPERVISOR', 'ADMIN'), autoDispatchValidators, dispatch.autoDispatchCleaning);
router.get('/queue', authenticate, authorize('STAFF'), dispatch.getStaffQueue);
router.patch('/tasks/:assignment_id/start', authenticate, authorize('STAFF'), assignmentIdParamValidators, dispatch.startWork);
router.patch('/tasks/:assignment_id', authenticate, authorize('STAFF'), assignmentIdParamValidators, dispatch.markWorkCompleted);

module.exports = router;
