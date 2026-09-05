const db = require('../config/db');

// Student closed-loop verification
exports.submitResolutionFeedback = async (req, res) => {
    const { complaint_id, is_satisfied, rating, comments } = req.body;
    const student_id = req.user.userId;

    try {
        await db.query('CALL sp_confirm_resolution($1, $2, $3, $4, $5)', [
            complaint_id,
            student_id,
            is_satisfied,
            rating || null,
            comments || null
        ]);

        res.status(200).json({
            message: is_satisfied
                ? 'Complaint closed and marked COMPLETED.'
                : 'Complaint ESCALATED for re-inspection.'
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
