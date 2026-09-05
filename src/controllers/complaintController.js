const db = require('../config/db');

// Create new ticket (STUDENT role)
exports.createComplaint = async (req, res) => {
    const { ticket_scope, room_id, common_area_id, block_id, subcategory_id, description, photo_evidence_url, priority, preferred_timeslot } = req.body;
    const raised_by_user_id = req.user.userId;

    try {
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
            raised_by_user_id,
            subcategory_id,
            description,
            photo_evidence_url || null,
            priority || 'MEDIUM',
            preferred_timeslot || null
        ];

        const result = await db.query(query, values);
        res.status(201).json({ message: 'Complaint registered', complaint: result.rows[0] });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// List complaints with role-based visibility
exports.getComplaints = async (req, res) => {
    const { role, userId } = req.user;
    const { status, block_id } = req.query;

    let query = `
    SELECT c.*, cat.category_name, sub.issue_name, u.full_name as student_name
    FROM complaints c
    JOIN complaint_subcategories sub ON c.subcategory_id = sub.subcategory_id
    JOIN complaint_categories cat ON sub.category_id = cat.category_id
    JOIN users u ON c.raised_by_user_id = u.user_id
    WHERE 1=1
  `;
    const params = [];

    // Students can only view tickets they filed
    if (role === 'STUDENT') {
        params.push(userId);
        query += ` AND c.raised_by_user_id = $${params.length}`;
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

    try {
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};