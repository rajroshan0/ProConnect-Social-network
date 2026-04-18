
//  routes/admin.js
//  Admin-only routes — every route here needs:
//    1. verifyToken  → must be logged in
//    2. requireAdmin → must have role = 'admin'
//
//  GET    /api/admin/users          → list all users
//  PUT    /api/admin/users/:id/role → change a user's role
//  DELETE /api/admin/users/:id      → delete any user


const express      = require('express');
const router       = express.Router();
const db           = require('../config/db');
const verifyToken  = require('../middleware/auth');
const requireAdmin = require('../middleware/role');

// Shorthand: both middlewares applied together
// Every route in this file runs through both guards
const adminOnly = [verifyToken, requireAdmin];

// ----------------------------------------------------------
// GET /api/admin/users — list ALL users (with full details)
// Admins see everything — passwords still excluded
// ----------------------------------------------------------
router.get('/users', adminOnly, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, name, email, job_title, company, role, created_at
             FROM profiles
             ORDER BY created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// PUT /api/admin/users/:id/role — change a user's role
// Body: { role }  — must be 'user' or 'admin'
//
// Use case: promote someone to admin, or demote an admin back to user
// ----------------------------------------------------------
router.put('/users/:id/role', adminOnly, async (req, res) => {
    const { role } = req.body;

    if (!role) {
        return res.status(400).json({ error: 'role is required' });
    }

    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: "role must be 'user' or 'admin'" });
    }

    // Safety: admin cannot demote themselves
    if (String(req.user.id) === String(req.params.id) && role !== 'admin') {
        return res.status(400).json({ error: 'You cannot demote yourself' });
    }

    try {
        const [result] = await db.query(
            'UPDATE profiles SET role = ? WHERE id = ?',
            [role, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: `User role updated to '${role}'` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// DELETE /api/admin/users/:id — admin deletes any user
// (CASCADE removes all their posts, connections, messages too)
//
// Safety: admin cannot delete their own account through this route
// ----------------------------------------------------------
router.delete('/users/:id', adminOnly, async (req, res) => {
    // Prevent admin from deleting themselves
    if (String(req.user.id) === String(req.params.id)) {
        return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    try {
        const [result] = await db.query(
            'DELETE FROM profiles WHERE id = ?',
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
