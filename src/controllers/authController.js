const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.register = async (req, res) => {
    const { reg_or_emp_id, full_name, email, phone_number, password, role, specialization } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const query = `
            INSERT INTO users (reg_or_emp_id, full_name, email, phone_number, password_hash, role, specialization)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING user_id, reg_or_emp_id, full_name, email, role, specialization, created_at;
        `;
        const values = [reg_or_emp_id, full_name, email, phone_number, password_hash, role, specialization || null];

        const result = await db.query(query, values);
        res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'User ID or Email already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    const { reg_or_emp_id, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE reg_or_emp_id = $1', [reg_or_emp_id]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { userId: user.user_id, role: user.role, regOrEmpId: user.reg_or_emp_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            token,
            user: {
                user_id: user.user_id,
                reg_or_emp_id: user.reg_or_emp_id,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};