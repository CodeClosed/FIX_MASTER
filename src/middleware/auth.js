const jwt = require('jsonwebtoken');

function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return undefined; // present but invalid/expired, as distinct from "absent"
    }
}

const authenticate = (req, res, next) => {
    const decoded = verifyToken(req.headers.authorization);
    if (decoded === null) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    if (decoded === undefined) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = decoded; // { userId, role, regOrEmpId }
    next();
};

/**
 * Like `authenticate`, but does not reject the request when no token (or an
 * invalid one) is supplied - it simply leaves req.user unset. Routes that
 * behave differently for anonymous vs. authenticated callers (currently:
 * registration, so only an authenticated ADMIN may set a role other than
 * STUDENT) use this instead of `authenticate`.
 */
const optionalAuthenticate = (req, res, next) => {
    const decoded = verifyToken(req.headers.authorization);
    if (decoded && decoded !== undefined) {
        req.user = decoded;
    }
    next();
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
        }
        next();
    };
};

module.exports = { authenticate, optionalAuthenticate, authorize };
