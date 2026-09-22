const db = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// GET /api/me - the login response only carries {user_id, reg_or_emp_id,
// full_name, role}; there was previously no way for a client to recover
// email, phone_number or specialization after the initial login, or to
// re-verify identity from a stored token. password_hash is deliberately
// excluded from the select list.
exports.getMe = asyncHandler(async (req, res) => {
    const result = await db.query(
        `SELECT user_id, reg_or_emp_id, full_name, email, phone_number, role, specialization, is_available, created_at
         FROM users WHERE user_id = $1`,
        [req.user.userId]
    );
    if (result.rows.length === 0) {
        throw new AppError(404, 'User not found.');
    }
    res.json(result.rows[0]);
});

// GET /api/me/allotment - previously nothing exposed a student's own room,
// which the 1-click quick-action flow needs.
exports.getMyAllotment = asyncHandler(async (req, res) => {
    if (req.user.role !== 'STUDENT') {
        throw new AppError(403, 'Only students have room allotments.');
    }

    const result = await db.query(
        `SELECT sra.room_id, r.block_id, r.room_number, r.floor_number, r.room_type, sra.academic_year, sra.assigned_date
         FROM student_room_allotments sra
         JOIN rooms r ON sra.room_id = r.room_id
         WHERE sra.student_id = $1 AND sra.is_current = TRUE`,
        [req.user.userId]
    );
    if (result.rows.length === 0) {
        throw new AppError(404, 'No current room allotment found for this student.');
    }
    res.json(result.rows[0]);
});
