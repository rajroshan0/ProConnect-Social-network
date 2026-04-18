
//  middleware/role.js
//  Checks if the logged-in user has the 'admin' role.
//
//  IMPORTANT: Always use verifyToken BEFORE requireAdmin.
//  verifyToken puts the user info on req.user.
//  requireAdmin reads from req.user.
//
//  HOW TO USE IT in a route file:
//    const verifyToken  = require('../middleware/auth');
//    const requireAdmin = require('../middleware/role');
//
//    router.post('/skills', verifyToken, requireAdmin, (req, res) => { ... })
//                           ^^^^^^^^^^^  ^^^^^^^^^^^^
//                           step 1       step 2


function requireAdmin(req, res, next) {

    // req.user was set by verifyToken middleware before this runs
    // If somehow this runs without verifyToken, req.user won't exist
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check the role inside the decoded JWT token
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied — admins only' });
        // 403 = Forbidden (you are logged in, but not allowed)
        // 401 = Unauthorized (you are not logged in at all)
    }

    // Role is admin — let them through
    next();
}

module.exports = requireAdmin;
