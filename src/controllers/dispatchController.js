const db = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const DISPATCHABLE_STATUSES = ['OPEN', 'ESCALATED'];

// Supervisor manual dispatch via stored procedure.
exports.assignTechnician = asyncHandler(async (req, res) => {
    const { complaint_id, staff_user_id } = req.body;
    const supervisor_user_id = req.user.userId;

    const complaintRes = await db.query(
        `SELECT c.status, sub.required_specialization
         FROM complaints c
         JOIN complaint_subcategories sub ON c.subcategory_id = sub.subcategory_id
         WHERE c.complaint_id = $1`,
        [complaint_id]
    );
    if (complaintRes.rows.length === 0) {
        throw new AppError(404, 'Complaint not found.');
    }
    const { status, required_specialization } = complaintRes.rows[0];
    if (!DISPATCHABLE_STATUSES.includes(status)) {
        throw new AppError(400, `Complaint is ${status} and cannot be (re)assigned right now.`);
    }

    const staffRes = await db.query('SELECT role, specialization FROM users WHERE user_id = $1', [staff_user_id]);
    if (staffRes.rows.length === 0 || staffRes.rows[0].role !== 'STAFF') {
        throw new AppError(400, 'staff_user_id does not refer to a valid staff member.');
    }
    // Previously unchecked: a supervisor could assign an electrician's ticket
    // to a plumber with no error from the API - the mismatch only showed up
    // later as a technician staring at a job outside their trade.
    if (staffRes.rows[0].specialization !== required_specialization) {
        throw new AppError(
            400,
            `This complaint requires a ${required_specialization} technician, but the selected staff member's specialization is ${staffRes.rows[0].specialization}.`
        );
    }

    await db.withTransaction(async (client) => {
        await client.query('CALL sp_supervisor_assign_task($1, $2, $3)', [complaint_id, staff_user_id, supervisor_user_id]);
    }, supervisor_user_id);

    res.status(200).json({ message: 'Task successfully assigned to technician.' });
});

// 1-Click Auto Dispatch for Cleaning.
exports.autoDispatchCleaning = asyncHandler(async (req, res) => {
    const { complaint_id } = req.body;
    const supervisor_user_id = req.user.userId;

    const complaintRes = await db.query(
        `SELECT c.status, sub.required_specialization
         FROM complaints c
         JOIN complaint_subcategories sub ON c.subcategory_id = sub.subcategory_id
         WHERE c.complaint_id = $1`,
        [complaint_id]
    );
    if (complaintRes.rows.length === 0) {
        throw new AppError(404, 'Complaint not found.');
    }
    const { status, required_specialization } = complaintRes.rows[0];

    if (required_specialization !== 'CLEANING') {
        throw new AppError(400, 'Auto-dispatch only applies to cleaning tickets. Use manual assignment for this complaint.');
    }
    if (!DISPATCHABLE_STATUSES.includes(status)) {
        throw new AppError(400, `Complaint is ${status} and cannot be dispatched right now.`);
    }

    // sp_auto_dispatch_cleaning's p_assigned_staff_id is an INOUT parameter:
    // NULL means no on-duty cleaner was found and the complaint was left OPEN.
    // Previously the controller reported "evaluated successfully" either way,
    // so a supervisor had no way to tell an actual dispatch from a silent no-op
    // short of re-fetching the complaint and comparing status by hand.
    const assignedStaffId = await db.withTransaction(async (client) => {
        const callResult = await client.query('CALL sp_auto_dispatch_cleaning($1, $2)', [complaint_id, null]);
        return callResult.rows[0] ? callResult.rows[0].p_assigned_staff_id : null;
    }, supervisor_user_id);

    if (!assignedStaffId) {
        return res.status(200).json({
            assigned: false,
            message: 'No cleaning staff are currently available. The ticket remains OPEN.',
        });
    }

    const staffRes = await db.query('SELECT full_name FROM users WHERE user_id = $1', [assignedStaffId]);
    const staffName = staffRes.rows[0] ? staffRes.rows[0].full_name : null;

    res.status(200).json({
        assigned: true,
        staff_user_id: assignedStaffId,
        staff_name: staffName,
        message: `Auto-dispatched to ${staffName || 'a technician'}.`,
    });
});

// Staff view of assigned tasks using view_staff_active_queue.
exports.getStaffQueue = asyncHandler(async (req, res) => {
    const staff_user_id = req.user.userId;
    const result = await db.query('SELECT * FROM view_staff_active_queue WHERE staff_user_id = $1', [staff_user_id]);
    res.json(result.rows);
});

/**
 * Loads an assignment row with FOR UPDATE (inside the caller's transaction)
 * and verifies it belongs to `staffUserId`, throwing an AppError otherwise.
 * Shared by markWorkCompleted and startWork so both transitions get the
 * same ownership + state checks.
 */
async function loadOwnedAssignment(client, assignmentId, staffUserId) {
    const result = await client.query(
        `SELECT assignment_id, complaint_id, staff_user_id, current_state
         FROM complaint_assignments
         WHERE assignment_id = $1
         FOR UPDATE`,
        [assignmentId]
    );
    if (result.rows.length === 0) {
        throw new AppError(404, 'Assignment not found.');
    }
    const assignment = result.rows[0];
    if (assignment.staff_user_id !== staffUserId) {
        // Previously ANY authenticated STAFF account could complete ANY other
        // staff member's task by guessing/enumerating assignment_id (a plain
        // auto-incrementing integer) - this is the fix.
        throw new AppError(403, 'You can only act on tasks assigned to you.');
    }
    return assignment;
}

// Staff starts work on an assigned task: ASSIGNED -> IN_PROGRESS.
exports.startWork = asyncHandler(async (req, res) => {
    const { assignment_id } = req.params;
    const staff_user_id = req.user.userId;

    const complaintId = await db.withTransaction(async (client) => {
        const assignment = await loadOwnedAssignment(client, assignment_id, staff_user_id);

        if (assignment.current_state !== 'ASSIGNED') {
            throw new AppError(400, `This task is ${assignment.current_state}, not ASSIGNED, and cannot be started.`);
        }

        await client.query(
            `UPDATE complaint_assignments SET current_state = 'IN_PROGRESS', started_at = CURRENT_TIMESTAMP WHERE assignment_id = $1`,
            [assignment.assignment_id]
        );
        await client.query(`UPDATE complaints SET status = 'IN_PROGRESS' WHERE complaint_id = $1`, [assignment.complaint_id]);

        return assignment.complaint_id;
    }, staff_user_id);

    res.json({ message: 'Task marked in progress.', complaint_id: complaintId });
});

// Staff marks work done -> moves complaint to PENDING_VERIFICATION.
//
// Fixed two bugs together here:
//   1. IDOR: no check that the assignment belonged to the calling staff member.
//   2. Split transaction: the previous version ran `db.query('BEGIN')` then
//      further `db.query(...)` calls against the pool, which is not guaranteed
//      to hand back the same connection for each call. Under concurrent load
//      a request's BEGIN and subsequent UPDATEs could land on different
//      backend connections, making the "transaction" non-atomic. Fixed by
//      using withTransaction(), which pins one client for the whole thing.
//   3. complaint_id is now read from the assignment row itself instead of
//      trusted from the request body, closing the door on a caller passing
//      an assignment_id and an unrelated complaint_id.
exports.markWorkCompleted = asyncHandler(async (req, res) => {
    const { assignment_id } = req.params;
    const staff_user_id = req.user.userId;

    const complaintId = await db.withTransaction(async (client) => {
        const assignment = await loadOwnedAssignment(client, assignment_id, staff_user_id);

        if (!['ASSIGNED', 'IN_PROGRESS'].includes(assignment.current_state)) {
            throw new AppError(400, `This task is already ${assignment.current_state} and cannot be marked done again.`);
        }

        await client.query(
            `UPDATE complaint_assignments SET current_state = 'DONE', work_completed_at = CURRENT_TIMESTAMP WHERE assignment_id = $1`,
            [assignment.assignment_id]
        );
        // Timestamps trigger fn_update_complaint_timestamps automatically.
        await client.query(`UPDATE complaints SET status = 'PENDING_VERIFICATION' WHERE complaint_id = $1`, [assignment.complaint_id]);

        return assignment.complaint_id;
    }, staff_user_id);

    res.json({ message: 'Task marked done, awaiting student verification.', complaint_id: complaintId });
});
