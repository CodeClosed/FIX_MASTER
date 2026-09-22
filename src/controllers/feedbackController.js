const db = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// Student closed-loop verification.
exports.submitResolutionFeedback = asyncHandler(async (req, res) => {
    const { complaint_id, is_satisfied, rating, comments } = req.body;
    const student_id = req.user.userId;

    const existing = await db.query('SELECT 1 FROM complaint_feedback WHERE complaint_id = $1', [complaint_id]);
    if (existing.rows.length > 0) {
        throw new AppError(409, 'Feedback has already been submitted for this complaint.');
    }

    // sp_confirm_resolution itself verifies the complaint exists and that
    // student_id matches raised_by_user_id (RAISE EXCEPTION otherwise, mapped
    // by the central error handler to a 400 with the procedure's message).
    await db.withTransaction(async (client) => {
        await client.query('CALL sp_confirm_resolution($1, $2, $3, $4, $5)', [
            complaint_id,
            student_id,
            is_satisfied,
            rating || null,
            comments || null,
        ]);
    }, student_id);

    res.status(200).json({
        message: is_satisfied
            ? 'Complaint closed and marked COMPLETED.'
            : 'Complaint ESCALATED for re-inspection.',
    });
});
