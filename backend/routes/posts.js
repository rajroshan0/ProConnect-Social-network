
//  routes/posts.js
//  Handles all /api/posts requests
//
//  GET    /api/posts        → get all posts (newest first)
//  GET    /api/posts/:id    → get one post
//  POST   /api/posts        → create a post
//  PUT    /api/posts/:id    → edit a post
//  DELETE /api/posts/:id    → delete a post
//
//  NOTE: Auth middleware (verifyToken) will be added in Phase 2B


const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// ----------------------------------------------------------
// GET /api/posts — get ALL posts, newest first
// Joins with profiles so we get the author's name too
// ----------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT
                p.id,
                p.content,
                p.created_at,
                pr.id   AS author_id,
                pr.name AS author_name,
                pr.job_title AS author_job_title
             FROM posts p
             JOIN profiles pr ON pr.id = p.posted_by_profile_id
             ORDER BY p.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// GET /api/posts/:id — get ONE post by id
// ----------------------------------------------------------
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT
                p.id,
                p.content,
                p.created_at,
                pr.id   AS author_id,
                pr.name AS author_name,
                pr.job_title AS author_job_title
             FROM posts p
             JOIN profiles pr ON pr.id = p.posted_by_profile_id
             WHERE p.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// POST /api/posts — create a new post
// Body: { content, posted_by_profile_id }
// In Phase 2B, posted_by_profile_id will come from JWT token
// ----------------------------------------------------------
router.post('/', async (req, res) => {
    const { content, posted_by_profile_id } = req.body;

    if (!content || !posted_by_profile_id) {
        return res.status(400).json({ error: 'content and posted_by_profile_id are required' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO posts (content, posted_by_profile_id) VALUES (?, ?)',
            [content, posted_by_profile_id]
        );
        res.status(201).json({
            message: 'Post created',
            postId: result.insertId
        });
    } catch (err) {
        // FK violation — profile does not exist
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// PUT /api/posts/:id — edit a post's content
// Body: { content }
// ----------------------------------------------------------
router.put('/:id', async (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'content is required' });
    }

    try {
        const [result] = await db.query(
            'UPDATE posts SET content = ? WHERE id = ?',
            [content, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ message: 'Post updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// DELETE /api/posts/:id — delete a post
// ----------------------------------------------------------
router.delete('/:id', async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM posts WHERE id = ?',
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json({ message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
