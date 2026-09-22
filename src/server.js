const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
const db = require('./config/db');
const { authLimiter, generalLimiter } = require('./middleware/rateLimiters');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Refuse to boot in production with the JWT secret left at its committed
// example value - anyone who has read .env.example (i.e. anyone with repo
// access) could otherwise forge valid tokens for any user, including ADMIN.
const DEFAULT_EXAMPLE_SECRET = 'fixmaster_super_secure_jwt_secret_2026_vit_deepika_j';
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Copy .env.example to .env and set a real secret.');
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === DEFAULT_EXAMPLE_SECRET) {
    throw new Error('JWT_SECRET is still the committed example value. Set a unique secret before running in production.');
}
if (process.env.NODE_ENV !== 'production' && process.env.JWT_SECRET === DEFAULT_EXAMPLE_SECRET) {
    console.warn('[WARN] JWT_SECRET is the committed example value. Fine for local dev, do not deploy like this.');
}

app.use(helmet());

// Allowed origins come from CORS_ORIGIN (comma-separated). With nothing set,
// CORS is left open (`cors()` with no options) so local frontend development
// against this API is not blocked before an origin is known; set CORS_ORIGIN
// before deploying anywhere it would matter.
if (process.env.CORS_ORIGIN) {
    const allowedOrigins = process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
    app.use(cors({ origin: allowedOrigins }));
} else {
    if (process.env.NODE_ENV === 'production') {
        console.warn('[WARN] CORS_ORIGIN is not set in production - allowing all origins.');
    }
    app.use(cors());
}

app.use(express.json());
app.use(generalLimiter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({ status: 'ok', server_time: result.rows[0].now });
    } catch (err) {
        console.error('Database query error in /api/health:', err);
        res.status(500).json({ status: 'error', message: 'Database connection error' });
    }
});

// Mount all API routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/dispatch', require('./routes/dispatchRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/meta', require('./routes/metaRoutes'));
app.use('/api/me', require('./routes/meRoutes'));

// Unmatched routes previously fell through to Express's default HTML 404
// page; API clients got an HTML body where they expected JSON.
app.use(notFoundHandler);

// Centralized error handler: maps known Postgres error codes and AppError
// instances to safe client-facing JSON, logs everything else server-side,
// and never forwards a raw driver error message to the client.
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

module.exports = app;
