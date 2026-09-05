const express = require('express');
const router = express.Router();
const dispatch = require('../controllers/dispatchController');
const { authenticate, authorize } = require('../middleware/auth');

// === DIAGNOSTIC LOG ===
console.log('--- ROUTE DEBUG ---');
console.log('1. authenticate type:', typeof authenticate);
console.log('2. authorize type:', typeof authorize);
console.log('3. assignTechnician type:', typeof dispatch.assignTechnician);
console.log('4. autoDispatch type:', typeof dispatch.autoDispatchCleaning);
console.log('-------------------');

router.post('/assign', authenticate, authorize('SUPERVISOR', 'ADMIN'), dispatch.assignTechnician);
router.post('/auto-dispatch', authenticate, authorize('SUPERVISOR', 'ADMIN'), dispatch.autoDispatchCleaning);
router.get('/queue', authenticate, authorize('STAFF'), dispatch.getStaffQueue);
router.patch('/tasks/:assignment_id', authenticate, authorize('STAFF'), dispatch.markWorkCompleted);

module.exports = router;