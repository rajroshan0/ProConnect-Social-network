
//  routes/profiles.js
//  Handles all /api/profiles requests
//
//  GET    /api/profiles        → get all profiles
//  GET    /api/profiles/:id    → get one profile
//  POST   /api/profiles        → create a profile
//  PUT    /api/profiles/:id    → update a profile
//  DELETE /api/profiles/:id    → delete a profile
//
//  NOTE: Auth middleware (verifyToken) will be added in Phase 2B


const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// ----------------------------------------------------------
// GET /api/profiles — get ALL profiles (optional ?q=search)
// ----------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const { q } = req.query;
        let rows;
        if (q) {
            [rows] = await db.query(
                `SELECT id, name, email, job_title, company, role, created_at
                 FROM profiles
                 WHERE name LIKE ? OR job_title LIKE ? OR company LIKE ?
                 LIMIT 20`,
                [`%${q}%`, `%${q}%`, `%${q}%`]
            );
        } else {
            [rows] = await db.query(
                'SELECT id, name, email, job_title, company, role, created_at FROM profiles'
            );
        }
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// GET /api/profiles/:id — get ONE profile by id
// Also returns that user's skills
// ----------------------------------------------------------
router.get('/:id', async (req, res) => {
    try {
        // Get the profile
        const [rows] = await db.query(
            'SELECT id, name, email, job_title, company, role, created_at FROM profiles WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Get that profile's skills
        const [skills] = await db.query(
            `SELECT s.id, s.name
             FROM skills s
             JOIN profile_skills ps ON ps.skill_id = s.id
             WHERE ps.profile_id = ?`,
            [req.params.id]
        );

        res.json({ ...rows[0], skills });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// POST /api/profiles — create a new profile
// Body: { name, email, password, job_title, company, role }
// NOTE: In real use, registration goes through /api/auth/register
//       This endpoint is for direct/admin creation.
// ----------------------------------------------------------
router.post('/', async (req, res) => {
    const { name, email, password, job_title, company, role } = req.body;

    // Basic validation
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'name, email, and password are required' });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO profiles (name, email, password, job_title, company, role)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, email, password, job_title || null, company || null, role || 'user']
        );
        res.status(201).json({
            message: 'Profile created',
            profileId: result.insertId
        });
    } catch (err) {
        // MySQL error 1062 = duplicate email
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Email already in use' });
        }
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// PUT /api/profiles/:id — update a profile
// Body: any combination of { name, job_title, company }
// (email and password changes handled separately in auth)
// ----------------------------------------------------------
router.put('/:id', async (req, res) => {
    const { name, job_title, company } = req.body;

    // Build only the fields that were actually sent
    const fields = [];
    const values = [];

    if (name      !== undefined) { fields.push('name = ?');      values.push(name); }
    if (job_title !== undefined) { fields.push('job_title = ?'); values.push(job_title); }
    if (company   !== undefined) { fields.push('company = ?');   values.push(company); }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'Nothing to update — send at least one field' });
    }

    values.push(req.params.id); // for WHERE id = ?

    try {
        const [result] = await db.query(
            `UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.json({ message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// DELETE /api/profiles/:id — delete a profile
// (CASCADE in schema removes related posts, connections, etc.)
// ----------------------------------------------------------
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM profiles WHERE id = ?',
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.json({ message: 'Profile deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
