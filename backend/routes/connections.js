
//  routes/connections.js
//  Handles all /api/connections requests
//
//  POST   /api/connections           → send a connection request
//  GET    /api/connections           → list MY connections
//  PUT    /api/connections/:id       → accept OR reject a request
//  DELETE /api/connections/:id       → remove / cancel a connection
//
//  NOTE: Auth middleware (verifyToken) will be added in Phase 2B
//        After that, from_profile_id will come from JWT, not body.


const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// ----------------------------------------------------------
// POST /api/connections — send a connection request
// Body: { from_profile_id, to_profile_id }
// ----------------------------------------------------------
router.post('/', async (req, res) => {
    const { from_profile_id, to_profile_id } = req.body;

    if (!from_profile_id || !to_profile_id) {
        return res.status(400).json({ error: 'from_profile_id and to_profile_id are required' });
    }

    // Cannot connect with yourself
    if (String(from_profile_id) === String(to_profile_id)) {
        return res.status(400).json({ error: 'You cannot send a connection request to yourself' });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO connections (from_profile_id, to_profile_id, status)
             VALUES (?, ?, 'pending')`,
            [from_profile_id, to_profile_id]
        );
        res.status(201).json({
            message: 'Connection request sent',
            connectionId: result.insertId
        });
    } catch (err) {
        // ER_DUP_ENTRY — request already exists in this direction
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Connection request already exists' });
        }
        // FK violation — one of the profiles does not exist
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(404).json({ error: 'One or both profiles not found' });
        }
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// GET /api/connections?profile_id=X
// List ALL connections for a given profile:
//   - accepted connections (both directions)
//   - pending requests they sent
//   - pending requests they received
// ----------------------------------------------------------
router.get('/', async (req, res) => {
    const { profile_id } = req.query;

    if (!profile_id) {
        return res.status(400).json({ error: 'profile_id query param is required  e.g. ?profile_id=1' });
    }

    try {
        const [rows] = await db.query(
            `SELECT
                c.id,
                c.status,
                c.created_at,
                -- who sent the request
                c.from_profile_id,
                pf.name AS from_name,
                -- who received it
                c.to_profile_id,
                pt.name AS to_name
             FROM connections c
             JOIN profiles pf ON pf.id = c.from_profile_id
             JOIN profiles pt ON pt.id = c.to_profile_id
             WHERE c.from_profile_id = ? OR c.to_profile_id = ?
             ORDER BY c.created_at DESC`,
            [profile_id, profile_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// PUT /api/connections/:id — accept or reject a request
// Body: { status }  — must be 'accepted' or 'rejected'
// Only the RECEIVER should call this (enforced in Phase 2B)
// ----------------------------------------------------------
router.put('/:id', async (req, res) => {
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ error: 'status is required' });
    }

    if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "status must be 'accepted' or 'rejected'" });
    }

    try {
        // Make sure the connection exists and is still pending
        const [rows] = await db.query(
            'SELECT * FROM connections WHERE id = ?',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Connection not found' });
        }
        if (rows[0].status !== 'pending') {
            return res.status(400).json({
                error: `Cannot update — connection is already '${rows[0].status}'`
            });
        }

        await db.query(
            'UPDATE connections SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        res.json({ message: `Connection ${status}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// DELETE /api/connections/:id — remove / cancel a connection
// Works whether status is pending, accepted, or rejected
// ----------------------------------------------------------
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM connections WHERE id = ?',
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Connection not found' });
        }
        res.json({ message: 'Connection removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
