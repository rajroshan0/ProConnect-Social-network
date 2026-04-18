
//  routes/auth.js
//  Handles registration and login
//
//  POST /api/auth/register  → create account (hashes password)
//  POST /api/auth/login     → verify password, return JWT token


const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../config/db');

// ----------------------------------------------------------
// POST /api/auth/register
// Body: { name, email, password, job_title, company }
//
// What happens:
//   1. Check if email is already taken
//   2. Hash the password with bcrypt (10 salt rounds)
//   3. Save the new profile to DB
//   4. Return success (no token yet — user must login)
// ----------------------------------------------------------
router.post('/register', async (req, res) => {
    const { name, email, password, job_title, company } = req.body;

    // Basic validation
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'name, email, and password are required' });
    }

    try {
        // 1. Check if email already exists
        const [existing] = await db.query(
            'SELECT id FROM profiles WHERE email = ?',
            [email]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // 2. Hash the password
        //    10 = salt rounds. Higher = slower but more secure.
        //    10 is the industry standard for web apps.
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Insert into DB — store the HASH, never the plain password
        const [result] = await db.query(
            `INSERT INTO profiles (name, email, password, job_title, company, role)
             VALUES (?, ?, ?, ?, ?, 'user')`,
            [name, email, hashedPassword, job_title || null, company || null]
        );

        // 4. Return success
        res.status(201).json({
            message: 'Account created successfully',
            profileId: result.insertId
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// POST /api/auth/login
// Body: { email, password }
//
// What happens:
//   1. Find the user by email
//   2. Compare plain password against stored bcrypt hash
//   3. If match → create JWT token with { id, role } inside
//   4. Return the token — client stores it in localStorage
// ----------------------------------------------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }

    try {
        // 1. Find user by email
        const [rows] = await db.query(
            'SELECT id, name, email, password, role FROM profiles WHERE email = ?',
            [email]
        );

        // User not found — use a vague message for security
        // (don't tell hackers whether email exists or not)
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = rows[0];

        // 2. Compare the password the user typed with the stored hash
        //    bcrypt.compare() hashes the plain text and checks if it matches
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // 3. Create the JWT token
        //    Payload: what we store INSIDE the token
        //    This gets decoded by auth.js middleware on every request
        const token = jwt.sign(
            { id: user.id, role: user.role },   // payload
            process.env.JWT_SECRET,              // secret key from .env
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }  // expires in 7 days
        );

        // 4. Send the token back
        //    The client (browser) saves this token in localStorage
        //    and sends it with every future request in the Authorization header
        res.json({
            message: 'Login successful',
            token,
            user: {
                id:       user.id,
                name:     user.name,
                email:    user.email,
                role:     user.role
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
