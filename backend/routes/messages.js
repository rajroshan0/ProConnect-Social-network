
//  routes/messages.js
//  Private messages between users
//
//  POST /api/messages        → send a message
//  GET  /api/messages/inbox  → messages I RECEIVED
//  GET  /api/messages/sent   → messages I SENT
//
//  All routes are protected — must be logged in (verifyToken)
//  sender_id always comes from JWT token, never from the body
//  (a user cannot fake being someone else)


const express     = require('express');
const router      = express.Router();
const db          = require('../config/db');
const verifyToken = require('../middleware/auth');

// ----------------------------------------------------------
// POST /api/messages — send a message
// Body: { receiver_id, content }
// sender_id comes from req.user.id (JWT token)
// ----------------------------------------------------------
router.post('/', verifyToken, async (req, res) => {
    const { receiver_id, content } = req.body;

    // sender_id is taken from the JWT — the logged-in user is always the sender
    const sender_id = req.user.id;

    if (!receiver_id || !content) {
        return res.status(400).json({ error: 'receiver_id and content are required' });
    }

    // Cannot message yourself
    if (String(sender_id) === String(receiver_id)) {
        return res.status(400).json({ error: 'You cannot send a message to yourself' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
            [sender_id, receiver_id, content]
        );
        res.status(201).json({
            message: 'Message sent',
            messageId: result.insertId
        });
    } catch (err) {
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(404).json({ error: 'Receiver not found' });
        }
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// GET /api/messages/inbox — messages I received
// Shows who sent each message + the content + time
// ----------------------------------------------------------
router.get('/inbox', verifyToken, async (req, res) => {
    const my_id = req.user.id;  // from JWT token

    try {
        const [rows] = await db.query(
            `SELECT
                m.id,
                m.content,
                m.sent_at,
                p.id   AS sender_id,
                p.name AS sender_name,
                p.job_title AS sender_job_title
             FROM messages m
             JOIN profiles p ON p.id = m.sender_id
             WHERE m.receiver_id = ?
             ORDER BY m.sent_at DESC`,
            [my_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// GET /api/messages/sent — messages I sent
// Shows who I sent to + the content + time
// ----------------------------------------------------------
router.get('/sent', verifyToken, async (req, res) => {
    const my_id = req.user.id;  // from JWT token

    try {
        const [rows] = await db.query(
            `SELECT
                m.id,
                m.content,
                m.sent_at,
                p.id   AS receiver_id,
                p.name AS receiver_name,
                p.job_title AS receiver_job_title
             FROM messages m
             JOIN profiles p ON p.id = m.receiver_id
             WHERE m.sender_id = ?
             ORDER BY m.sent_at DESC`,
            [my_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// GET /api/messages/conversation/:otherId
// Get all messages between me and another user (chronological)
// ----------------------------------------------------------
router.get('/conversation/:otherId', verifyToken, async (req, res) => {
    const my_id    = req.user.id;
    const other_id = req.params.otherId;

    try {
        const [rows] = await db.query(
            `SELECT
                m.id,
                m.content,
                m.sent_at,
                m.sender_id,
                m.receiver_id,
                ps.name AS sender_name,
                pr.name AS receiver_name
             FROM messages m
             JOIN profiles ps ON ps.id = m.sender_id
             JOIN profiles pr ON pr.id = m.receiver_id
             WHERE (m.sender_id = ? AND m.receiver_id = ?)
                OR (m.sender_id = ? AND m.receiver_id = ?)
             ORDER BY m.sent_at ASC`,
            [my_id, other_id, other_id, my_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// GET /api/messages/contacts
// Get all users I've ever chatted with (for sidebar list)
// ----------------------------------------------------------
router.get('/contacts', verifyToken, async (req, res) => {
    const my_id = req.user.id;

    try {
        const [rows] = await db.query(
            `SELECT DISTINCT
                p.id, p.name, p.job_title,
                (SELECT content FROM messages m2
                 WHERE (m2.sender_id = p.id AND m2.receiver_id = ?)
                    OR (m2.sender_id = ? AND m2.receiver_id = p.id)
                 ORDER BY m2.sent_at DESC LIMIT 1) AS last_message,
                (SELECT sent_at FROM messages m3
                 WHERE (m3.sender_id = p.id AND m3.receiver_id = ?)
                    OR (m3.sender_id = ? AND m3.receiver_id = p.id)
                 ORDER BY m3.sent_at DESC LIMIT 1) AS last_at
             FROM messages m
             JOIN profiles p ON p.id = IF(m.sender_id = ?, m.receiver_id, m.sender_id)
             WHERE m.sender_id = ? OR m.receiver_id = ?
             ORDER BY last_at DESC`,
            [my_id, my_id, my_id, my_id, my_id, my_id, my_id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
