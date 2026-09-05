const db = require('../config/db');

// KPI summary across hostel blocks
exports.getBlockSummary = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM view_block_supervisor_summary');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Recurring hotspot / defect alerts
exports.getDefectHotspots = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM view_recurring_defects_alert');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};