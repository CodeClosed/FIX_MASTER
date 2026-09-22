const rateLimit = require('express-rate-limit');

// Applied to /api/auth/* only. Login/register are the only unauthenticated,
// credential-guessing-prone endpoints in this API - everything else already
// requires a valid JWT, which is a much stronger throttle than IP-based
// limiting alone.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts from this IP. Please try again later.' },
});

// A looser, general-purpose ceiling for the rest of the API, mainly to blunt
// accidental client-side retry loops and trivial scripted abuse.
const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down.' },
});

module.exports = { authLimiter, generalLimiter };
