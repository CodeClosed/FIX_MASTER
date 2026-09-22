const db = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// required_specialization is included so a dispatch UI can pre-filter the
// staff picker to the trade this ticket actually needs, instead of listing
// every technician and relying solely on the server-side mismatch rejection
// in dispatchController.assignTechnician.
const COMPLAINT_SELECT = `
    SELECT c.*, cat.category_name, sub.issue_name, sub.required_specialization, u.full_name as student_name
    FROM complaints c
    JOIN complaint_subcategories sub ON c.subcategory_id = sub.subcategory_id
    JOIN complaint_categories cat ON sub.category_id = cat.category_id
    JOIN users u ON c.raised_by_user_id = u.user_id
`;

/**
 * Confirms the room/common-area named in the request actually belongs to
 * the given block, and - for a self-filing student - that they currently
 * live in that room. Previously none of this was checked: a student could
 * file a ROOM ticket against a room they had never been allotted, and
 * nothing stopped `block_id` from disagreeing with the room's real block.
 */
async function assertValidLocation({ ticket_scope, room_id, common_area_id, block_id, userId, role }) {
    if (ticket_scope === 'ROOM') {
        const room = await db.query('SELECT block_id FROM rooms WHERE room_id = $1 AND is_active = TRUE', [room_id]);
        if (room.rows.length === 0) {
            throw new AppError(404, `Room ${room_id} was not found or is inactive.`);
        }
        if (room.rows[0].block_id !== block_id) {
            throw new AppError(400, `Room ${room_id} does not belong to block ${block_id}.`);
        }

        if (role === 'STUDENT') {
            const allotment = await db.query(
                `SELECT 1 FROM student_room_allotments WHERE student_id = $1 AND room_id = $2 AND is_current = TRUE`,
                [userId, room_id]
            );
            if (allotment.rows.length === 0) {
                throw new AppError(403, 'You may only raise room tickets for the room you are currently allotted to.');
            }
        }
    } else {
        const area = await db.query('SELECT block_id FROM common_areas WHERE area_id = $1', [common_area_id]);
        if (area.rows.length === 0) {
            throw new AppError(404, `Common area ${common_area_id} was not found.`);
        }
        if (area.rows[0].block_id !== block_id) {
            throw new AppError(400, `Common area ${common_area_id} does not belong to block ${block_id}.`);
        }
    }
}

// Create new ticket (STUDENT, SUPERVISOR, ADMIN)
exports.createComplaint = asyncHandler(async (req, res) => {
    const { ticket_scope, room_id, common_area_id, block_id, subcategory_id, description, photo_evidence_url, priority, preferred_timeslot } = req.body;
    const { userId, role } = req.user;

    await assertValidLocation({ ticket_scope, room_id, common_area_id, block_id, userId, role });

    const query = `
      INSERT INTO complaints (
        ticket_scope, room_id, common_area_id, block_id, raised_by_user_id,
        subcategory_id, description, photo_evidence_url, priority, preferred_timeslot
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [
        ticket_scope,
        ticket_scope === 'ROOM' ? room_id : null,
        ticket_scope === 'COMMON_AREA' ? common_area_id : null,
        block_id,
        userId,
        subcategory_id,
        description || null,
        photo_evidence_url || null,
        priority || 'MEDIUM',
        preferred_timeslot || null,
    ];

    const result = await db.query(query, values);
    res.status(201).json({ message: 'Complaint registered', complaint: result.rows[0] });
});

// List complaints with role-based visibility.
//
// STUDENT: only their own tickets (unchanged).
// STAFF: only tickets they have (or had) an assignment on. Previously STAFF
//   had no filter at all and received every complaint in the system,
//   including other students' names, phone numbers and full descriptions
//   for tickets they had nothing to do with.
// SUPERVISOR / ADMIN: unrestricted, since dispatch requires seeing everything.
exports.getComplaints = asyncHandler(async (req, res) => {
    const { role, userId } = req.user;
    const { status, block_id } = req.query;

    let query = `${COMPLAINT_SELECT} WHERE 1=1`;
    const params = [];

    if (role === 'STUDENT') {
        params.push(userId);
        query += ` AND c.raised_by_user_id = $${params.length}`;
    } else if (role === 'STAFF') {
        params.push(userId);
        query += ` AND EXISTS (
            SELECT 1 FROM complaint_assignments ca
            WHERE ca.complaint_id = c.complaint_id AND ca.staff_user_id = $${params.length}
        )`;
    }

    if (status) {
        params.push(status);
        query += ` AND c.status = $${params.length}`;
    }

    if (block_id) {
        params.push(block_id);
        query += ` AND c.block_id = $${params.length}`;
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
});

// GET /api/complaints/:id - single complaint, same visibility rules as the list.
exports.getComplaintById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role, userId } = req.user;

    const result = await db.query(`${COMPLAINT_SELECT} WHERE c.complaint_id = $1`, [id]);
    if (result.rows.length === 0) {
        throw new AppError(404, 'Complaint not found.');
    }

    const complaint = result.rows[0];

    if (role === 'STUDENT' && complaint.raised_by_user_id !== userId) {
        throw new AppError(403, 'You may only view your own complaints.');
    }
    if (role === 'STAFF') {
        const assigned = await db.query(
            'SELECT 1 FROM complaint_assignments WHERE complaint_id = $1 AND staff_user_id = $2',
            [id, userId]
        );
        if (assigned.rows.length === 0) {
            throw new AppError(403, 'You may only view complaints assigned to you.');
        }
    }

    res.json(complaint);
});

// GET /api/complaints/:id/logs - audit trail, same visibility rules as the detail view.
exports.getComplaintLogs = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role, userId } = req.user;

    const complaintCheck = await db.query('SELECT raised_by_user_id FROM complaints WHERE complaint_id = $1', [id]);
    if (complaintCheck.rows.length === 0) {
        throw new AppError(404, 'Complaint not found.');
    }
    if (role === 'STUDENT' && complaintCheck.rows[0].raised_by_user_id !== userId) {
        throw new AppError(403, 'You may only view your own complaints.');
    }
    if (role === 'STAFF') {
        const assigned = await db.query(
            'SELECT 1 FROM complaint_assignments WHERE complaint_id = $1 AND staff_user_id = $2',
            [id, userId]
        );
        if (assigned.rows.length === 0) {
            throw new AppError(403, 'You may only view complaints assigned to you.');
        }
    }

    const logs = await db.query(
        `SELECT cl.log_id, cl.previous_status, cl.new_status, cl.action_note, cl.timestamp, u.full_name AS changed_by_name
         FROM complaint_logs cl
         LEFT JOIN users u ON cl.changed_by_user_id = u.user_id
         WHERE cl.complaint_id = $1
         ORDER BY cl.timestamp ASC`,
        [id]
    );
    res.json(logs.rows);
});
