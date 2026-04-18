
//  routes/skills.js
//  Manages the skills catalog and profile-skill links
//
//  PUBLIC (any logged-in user):
//    GET    /api/skills                          → list all skills
//    POST   /api/profiles/:id/skills             → add skill to MY profile
//    DELETE /api/profiles/:id/skills/:skillId    → remove skill from MY profile
//
//  ADMIN ONLY:
//    POST   /api/skills          → add a new skill to the catalog
//    DELETE /api/skills/:id      → remove a skill from the catalog


const express      = require('express');
const router       = express.Router();
const db           = require('../config/db');
const verifyToken  = require('../middleware/auth');
const requireAdmin = require('../middleware/role');

// ----------------------------------------------------------
// GET /api/skills — list ALL skills in the catalog
// Public route — even guests can see the skill list
// ----------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name FROM skills ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// POST /api/skills — ADMIN adds a new skill to the catalog
// Body: { name }
// Protected: verifyToken → requireAdmin (both must pass)
// ----------------------------------------------------------
router.post('/', verifyToken, requireAdmin, async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Skill name is required' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO skills (name) VALUES (?)',
            [name]
        );
        res.status(201).json({
            message: 'Skill added to catalog',
            skillId: result.insertId
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Skill already exists in catalog' });
        }
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// DELETE /api/skills/:id — ADMIN removes a skill from catalog
// (CASCADE in schema will also remove it from all profiles)
// ----------------------------------------------------------
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM skills WHERE id = ?',
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Skill not found' });
        }
        res.json({ message: 'Skill removed from catalog' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// POST /api/profiles/:id/skills
// User adds a skill to THEIR OWN profile
// Body: { skill_id }
// Protected: must be logged in
// ----------------------------------------------------------
router.post('/profile/:id/skills', verifyToken, async (req, res) => {
    const profileId = req.params.id;
    const { skill_id } = req.body;

    if (!skill_id) {
        return res.status(400).json({ error: 'skill_id is required' });
    }

    // Security: users can only add skills to their OWN profile
    // req.user.id comes from the JWT token (set by verifyToken)
    if (String(req.user.id) !== String(profileId) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You can only add skills to your own profile' });
    }

    try {
        await db.query(
            'INSERT INTO profile_skills (profile_id, skill_id) VALUES (?, ?)',
            [profileId, skill_id]
        );
        res.status(201).json({ message: 'Skill added to profile' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'You already have this skill on your profile' });
        }
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(404).json({ error: 'Profile or skill not found' });
        }
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------------
// DELETE /api/profiles/:id/skills/:skillId
// User removes a skill from THEIR OWN profile
// ----------------------------------------------------------
router.delete('/profile/:id/skills/:skillId', verifyToken, async (req, res) => {
    const { id: profileId, skillId } = req.params;

    // Security: only own profile or admin
    if (String(req.user.id) !== String(profileId) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You can only remove skills from your own profile' });
    }

    try {
        const [result] = await db.query(
            'DELETE FROM profile_skills WHERE profile_id = ? AND skill_id = ?',
            [profileId, skillId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Skill not found on this profile' });
        }
        res.json({ message: 'Skill removed from profile' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
