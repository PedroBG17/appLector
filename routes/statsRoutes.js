const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { poolPromise, sql } = require('../db');

// Get stats
router.get('/', auth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .query('SELECT XP as xp, Level as level, PagesTranslated as pagesTranslated, FastestTranslationTimeMs as fastestTranslationTimeMs FROM UserStats WHERE UserId = @userId');

        const stats = result.recordset[0];
        if (!stats) {
            return res.status(404).json({ success: false, message: 'Stats not found' });
        }

        res.json({ success: true, data: stats });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update XP
router.post('/xp', auth, async (req, res) => {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ success: false, message: 'Amount required' });

    try {
        const pool = await poolPromise;

        // Get current stats
        const statsResult = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .query('SELECT XP, Level, PagesTranslated FROM UserStats WHERE UserId = @userId');

        let { XP, Level, PagesTranslated } = statsResult.recordset[0];

        XP += amount;
        PagesTranslated += 1;
        Level = Math.floor(XP / 100) + 1;

        // Update stats
        await pool.request()
            .input('xp', sql.Int, XP)
            .input('level', sql.Int, Level)
            .input('pages', sql.Int, PagesTranslated)
            .input('userId', sql.Int, req.user.userId)
            .query('UPDATE UserStats SET XP = @xp, Level = @level, PagesTranslated = @pages WHERE UserId = @userId');

        res.json({
            success: true,
            message: 'XP updated',
            data: { xp: XP, level: Level, pagesTranslated: PagesTranslated }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
