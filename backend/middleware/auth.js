
//  middleware/auth.js
//  Verifies the JWT token on every protected route.
//
//  HOW TO USE IT in a route file:
//    const verifyToken = require('../middleware/auth');
//    router.get('/something', verifyToken, (req, res) => { ... })
//                             ^^^^^^^^^^^
//                             runs BEFORE the route handler


const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {

    // 1. Read the token from the Authorization header
    //    The client sends:  Authorization: Bearer <token>
    const authHeader = req.headers['authorization'];

    // 2. If no header at all → reject immediately
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }

    // 3. The header looks like "Bearer eyJhbGci..."
    //    We split by space and take the second part (index 1)
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token format invalid. Use: Bearer <token>' });
    }

    // 4. Verify the token using our secret key from .env
    //    If it's valid, jwt.verify() gives us back the payload we put in during login
    //    The payload contains: { id, role }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 5. Attach the decoded user info to req.user
        //    Now any route handler can use req.user.id and req.user.role
        req.user = decoded;

        // 6. Call next() to pass control to the actual route handler
        next();

    } catch (err) {
        // jwt.verify() throws if token is expired or tampered with
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = verifyToken;
