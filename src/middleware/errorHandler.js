/**
 * A known, expected failure (bad input, missing resource, access denied)
 * that should be shown to the client as-is. Anything thrown that is NOT
 * an AppError is treated as unexpected and never sent to the client verbatim.
 */
class AppError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.isAppError = true;
    }
}

/**
 * Wraps an async Express handler so a rejected promise (including a thrown
 * error from an `await`ed db call) is forwarded to next(err) instead of
 * crashing the process or hanging the request.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Maps common PostgreSQL error codes to a safe status + message. Anything
// not listed here falls through to a generic 500 - the raw driver message
// (which can include table/column names and query fragments) is logged
// server-side only, never sent to the client.
const PG_ERROR_MAP = {
    '23505': { status: 409, message: 'A record with that value already exists.' },
    '23503': { status: 400, message: 'This action references a record that does not exist.' },
    '23514': { status: 400, message: 'One or more values violate a data constraint.' },
    '23502': { status: 400, message: 'A required field was missing.' },
    '22P02': { status: 400, message: 'One or more values were in an invalid format.' },
};

// Express 5 error-handling middleware: 4 args, next unused but required by signature.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    if (err && err.isAppError) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    if (err && err.code && PG_ERROR_MAP[err.code]) {
        console.error(`[db:${err.code}]`, err.message);
        const mapped = PG_ERROR_MAP[err.code];
        return res.status(mapped.status).json({ error: mapped.message });
    }

    // A stored procedure RAISE EXCEPTION surfaces here with err.code === 'P0001'
    // and a deliberately client-safe message set by the procedure itself.
    if (err && err.code === 'P0001') {
        return res.status(400).json({ error: err.message });
    }

    console.error('Unhandled error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
}

function notFoundHandler(req, res) {
    res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
}

module.exports = { AppError, asyncHandler, errorHandler, notFoundHandler };
