const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { poolPromise, sql } = require('../db');

// Get history
router.get('/history', auth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .query('SELECT * FROM ReadingHistory WHERE UserId = @userId ORDER BY LastReadAt DESC');

        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update progress
router.post('/history', auth, async (req, res) => {
    const { comicId, lastPage } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .input('comicId', sql.NVarChar, comicId)
            .input('lastPage', sql.Int, lastPage)
            .query(`
        IF EXISTS (SELECT 1 FROM ReadingHistory WHERE UserId = @userId AND ComicId = @comicId)
        BEGIN
          UPDATE ReadingHistory SET LastPageRead = @lastPage, LastReadAt = GETDATE()
          WHERE UserId = @userId AND ComicId = @comicId
        END
        ELSE
        BEGIN
          INSERT INTO ReadingHistory (UserId, ComicId, LastPageRead, LastReadAt)
          VALUES (@userId, @comicId, @lastPage, GETDATE())
        END
      `);
        res.json({ success: true, message: 'Progress updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get favorites
router.get('/favorites', auth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .query('SELECT f.*, c.Title, c.CoverUrl FROM Favorites f JOIN Comics c ON f.ComicId = c.ComicId WHERE f.UserId = @userId');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add favorite
router.post('/favorites', auth, async (req, res) => {
    const { comicId } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .input('comicId', sql.Int, comicId)
            .query('IF NOT EXISTS (SELECT 1 FROM Favorites WHERE UserId = @userId AND ComicId = @comicId) INSERT INTO Favorites (UserId, ComicId) VALUES (@userId, @comicId)');
        res.json({ success: true, message: 'Added to favorites' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Remove favorite
router.delete('/favorites/:comicId', auth, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .input('comicId', sql.Int, req.params.comicId)
            .query('DELETE FROM Favorites WHERE UserId = @userId AND ComicId = @comicId');
        res.json({ success: true, message: 'Removed from favorites' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
