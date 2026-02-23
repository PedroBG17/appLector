const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { poolPromise, sql } = require('../db');

// Check cache
router.get('/cache', auth, async (req, res) => {
    const { sourceText, sourceLang, targetLang } = req.query;
    try {
        const pool = await poolPromise;
        const hash = Buffer.from(sourceText).toString('base64').substring(0, 100); // Simple hash-like ID for demo

        const result = await pool.request()
            .input('source', sql.NVarChar, sourceText)
            .input('sl', sql.NVarChar, sourceLang)
            .input('tl', sql.NVarChar, targetLang)
            .query('SELECT TranslatedText FROM TranslationCache WHERE SourceText = @source AND SourceLang = @sl AND TargetLang = @tl');

        if (result.recordset.length > 0) {
            return res.json({ success: true, data: result.recordset[0].TranslatedText });
        }
        res.json({ success: false, message: 'Not in cache' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Save to cache
router.post('/save', auth, async (req, res) => {
    const { sourceText, translatedText, sourceLang, targetLang } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('source', sql.NVarChar, sourceText)
            .input('trans', sql.NVarChar, translatedText)
            .input('sl', sql.NVarChar, sourceLang)
            .input('tl', sql.NVarChar, targetLang)
            .query('INSERT INTO TranslationCache (SourceText, TranslatedText, SourceLang, TargetLang) VALUES (@source, @trans, @sl, @tl)');
        res.json({ success: true, message: 'Saved to cache' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
