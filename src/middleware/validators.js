const { body, param, query, validationResult } = require('express-validator');

const ROLES = ['STUDENT', 'STAFF', 'SUPERVISOR', 'ADMIN'];
const SPECIALIZATIONS = ['CLEANING', 'ELECTRICIAN', 'CARPENTER', 'AC_TECH', 'PLUMBER'];
const TICKET_SCOPES = ['ROOM', 'COMMON_AREA'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];
const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'COMPLETED', 'ESCALATED', 'REJECTED'];

/** Runs after a validation chain; returns a single friendly 400 on the first failure. */
function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array({ onlyFirstError: true })[0].msg });
    }
    next();
}

const registerValidators = [
    body('reg_or_emp_id').trim().notEmpty().withMessage('reg_or_emp_id is required.'),
    body('full_name').trim().notEmpty().withMessage('full_name is required.'),
    body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
    body('phone_number').trim().matches(/^\d{10}$/).withMessage('phone_number must be exactly 10 digits.'),
    body('password').isString().withMessage('password is required.').bail().isLength({ min: 8 }).withMessage('password must be at least 8 characters.'),
    body('role').optional().isIn(ROLES).withMessage(`role must be one of: ${ROLES.join(', ')}.`),
    body('specialization')
        .optional({ nullable: true })
        .isIn(SPECIALIZATIONS)
        .withMessage(`specialization must be one of: ${SPECIALIZATIONS.join(', ')}.`),
    handleValidation,
];

const loginValidators = [
    body('reg_or_emp_id').trim().notEmpty().withMessage('reg_or_emp_id is required.'),
    body('password').exists({ checkFalsy: true }).withMessage('password is required.').bail().isString(),
    handleValidation,
];

const createComplaintValidators = [
    body('ticket_scope').isIn(TICKET_SCOPES).withMessage(`ticket_scope must be one of: ${TICKET_SCOPES.join(', ')}.`),
    body('block_id').trim().notEmpty().withMessage('block_id is required.'),
    body('subcategory_id').isInt({ min: 1 }).withMessage('subcategory_id must be a positive integer.'),
    body('room_id')
        .if(body('ticket_scope').equals('ROOM'))
        .trim().notEmpty().withMessage('room_id is required when ticket_scope is ROOM.'),
    body('common_area_id')
        .if(body('ticket_scope').equals('COMMON_AREA'))
        .trim().notEmpty().withMessage('common_area_id is required when ticket_scope is COMMON_AREA.'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('description must be at most 500 characters.'),
    body('photo_evidence_url').optional({ nullable: true }).isString().isLength({ max: 255 }),
    body('priority').optional({ nullable: true }).isIn(PRIORITIES).withMessage(`priority must be one of: ${PRIORITIES.join(', ')}.`),
    body('preferred_timeslot').optional({ nullable: true }).isString().isLength({ max: 50 }),
    handleValidation,
];

const listComplaintsValidators = [
    query('status').optional().isIn(STATUSES).withMessage(`status must be one of: ${STATUSES.join(', ')}.`),
    query('block_id').optional().trim().notEmpty(),
    handleValidation,
];

const complaintIdParamValidators = [
    param('id').trim().notEmpty().withMessage('complaint id is required.'),
    handleValidation,
];

const assignTechnicianValidators = [
    body('complaint_id').trim().notEmpty().withMessage('complaint_id is required.'),
    body('staff_user_id').trim().notEmpty().withMessage('staff_user_id is required.'),
    handleValidation,
];

const autoDispatchValidators = [
    body('complaint_id').trim().notEmpty().withMessage('complaint_id is required.'),
    handleValidation,
];

const assignmentIdParamValidators = [
    param('assignment_id').isInt({ min: 1 }).withMessage('assignment_id must be a positive integer.'),
    handleValidation,
];

const feedbackValidators = [
    body('complaint_id').trim().notEmpty().withMessage('complaint_id is required.'),
    body('is_satisfied').isBoolean().withMessage('is_satisfied must be true or false.').toBoolean(),
    body('rating').optional({ nullable: true }).isInt({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5.'),
    body('comments').optional({ nullable: true }).isString().isLength({ max: 1000 }),
    handleValidation,
];

const blockIdParamValidators = [
    param('block_id').trim().notEmpty().withMessage('block_id is required.'),
    handleValidation,
];

const listStaffValidators = [
    query('specialization').optional().isIn(SPECIALIZATIONS).withMessage(`specialization must be one of: ${SPECIALIZATIONS.join(', ')}.`),
    handleValidation,
];

module.exports = {
    ROLES,
    SPECIALIZATIONS,
    handleValidation,
    registerValidators,
    loginValidators,
    createComplaintValidators,
    listComplaintsValidators,
    complaintIdParamValidators,
    assignTechnicianValidators,
    autoDispatchValidators,
    assignmentIdParamValidators,
    feedbackValidators,
    blockIdParamValidators,
    listStaffValidators,
};
