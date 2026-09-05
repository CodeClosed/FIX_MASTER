const db = require('../config/db');

exports.getBlocks = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM hostel_blocks ORDER BY block_id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getRoomsByBlock = async (req, res) => {
    const { block_id } = req.params;
    try {
        const result = await db.query(
            'SELECT * FROM rooms WHERE block_id = $1 AND is_active = TRUE ORDER BY floor_number, room_number',
            [block_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getCategoriesWithSubcategories = async (req, res) => {
    try {
        const query = `
      SELECT 
        c.category_id,
        c.category_name,
        c.category_code,
        c.is_quick_action,
        json_agg(
          json_build_object(
            'subcategory_id', s.subcategory_id,
            'issue_name', s.issue_name,
            'priority_level', s.priority_level,
            'required_specialization', s.required_specialization
          )
        ) AS subcategories
      FROM complaint_categories c
      LEFT JOIN complaint_subcategories s ON c.category_id = s.category_id
      GROUP BY c.category_id;
    `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};