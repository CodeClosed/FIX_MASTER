const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

const SPECIALIZATION_ROLES = ['STAFF'];

/**
 * POST /api/auth/register
 *
 * This endpoint is intentionally reachable without a token (self-service
 * student signup), which previously meant ANY caller could set role to
 * STAFF, SUPERVISOR, or even ADMIN in the request body with no checks at
 * all. Fix: an unauthenticated (or non-ADMIN) caller is always registered
 * as STUDENT regardless of what `role` they send; only a request already
 * carrying a valid ADMIN JWT (see optionalAuthenticate in authRoutes) may
 * create a STAFF/SUPERVISOR/ADMIN account.
 */
exports.register = asyncHandler(async (req, res) => {
    const { reg_or_emp_id, full_name, email, phone_number, password } = req.body;
    const requestedRole = req.body.role || 'STUDENT';
    const requesterIsAdmin = Boolean(req.user && req.user.role === 'ADMIN');

    const role = requesterIsAdmin ? requestedRole : 'STUDENT';

    if (role !== 'STUDENT' && !requesterIsAdmin) {
        // Should be unreachable given the line above, kept as an explicit
        // guard so a future refactor can't silently reopen the hole.
        throw new AppError(403, 'Only an administrator can create non-student accounts.');
    }

    let specialization = null;
    if (SPECIALIZATION_ROLES.includes(role)) {
        specialization = req.body.specialization || null;
        if (!specialization) {
            throw new AppError(400, 'specialization is required for STAFF accounts.');
        }
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const query = `
        INSERT INTO users (reg_or_emp_id, full_name, email, phone_number, password_hash, role, specialization)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING user_id, reg_or_emp_id, full_name, email, role, specialization, created_at;
    `;
    const values = [reg_or_emp_id, full_name, email, phone_number, password_hash, role, specialization];

    const result = await db.query(query, values);
    res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
});

exports.login = asyncHandler(async (req, res) => {
    const { reg_or_emp_id, password } = req.body;

    const result = await db.query('SELECT * FROM users WHERE reg_or_emp_id = $1', [reg_or_emp_id]);
    if (result.rows.length === 0) {
        throw new AppError(401, 'Invalid credentials.');
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new AppError(401, 'Invalid credentials.');
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
            role: user.role,
        },
    });
});
