const db = require('../config/db');

// Supervisor manual dispatch via Stored Procedure
exports.assignTechnician = async (req, res) => {
    const { complaint_id, staff_user_id } = req.body;
    const supervisor_user_id = req.user.userId;

    try {
        await db.query('CALL sp_supervisor_assign_task($1, $2, $3)', [
            complaint_id,
            staff_user_id,
            supervisor_user_id
        ]);

        res.status(200).json({ message: 'Task successfully assigned to technician via procedure.' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// 1-Click Auto Dispatch for Cleaning
exports.autoDispatchCleaning = async (req, res) => {
    const { complaint_id } = req.body;

    try {
        await db.query('CALL sp_auto_dispatch_cleaning($1)', [complaint_id]);
        res.status(200).json({ message: 'Auto-dispatch evaluated successfully.' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Staff view of assigned tasks using view_staff_active_queue
exports.getStaffQueue = async (req, res) => {
    const staff_user_id = req.user.userId;

    try {
        const result = await db.query(
            'SELECT * FROM view_staff_active_queue WHERE staff_user_id = $1',
            [staff_user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Staff marks work done -> moves status to PENDING_VERIFICATION
exports.markWorkCompleted = async (req, res) => {
    const { assignment_id } = req.params;
    const { complaint_id } = req.body;

    try {
        await db.query('BEGIN');

        await db.query(
            `UPDATE complaint_assignments 
       SET current_state = 'DONE', work_completed_at = CURRENT_TIMESTAMP 
       WHERE assignment_id = $1`,
            [assignment_id]
        );

        // Timestamps trigger fn_update_complaint_timestamps automatically
        await db.query(
            `UPDATE complaints 
       SET status = 'PENDING_VERIFICATION' 
       WHERE complaint_id = $1`,
            [complaint_id]
        );

        await db.query('COMMIT');
        res.json({ message: 'Task marked done, awaiting student verification.' });
    } catch (err) {
        await db.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
};