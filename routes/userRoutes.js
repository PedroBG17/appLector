const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { poolPromise, sql } = require('../db');

// Register
router.post('/register', async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ success: false, message: 'Please enter all fields' });
    }

    try {
        const pool = await poolPromise;

        // Check if user exists
        const userCheck = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE Email = @email');

        if (userCheck.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, hashedPassword)
            .query(`
        INSERT INTO Users (Email, Username, PasswordHash) 
        OUTPUT INSERTED.Id
        VALUES (@email, @username, @password);
      `);

        const userId = result.recordset[0].Id;

        // Initialize user stats
        await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
        INSERT INTO UserStats (UserId, XP, Level, PagesTranslated)
        VALUES (@userId, 0, 1, 0);
      `);

        // Create Token
        const token = jwt.sign({ userId, username }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            message: 'User registered successfully',
            data: {
                token,
                userId,
                username
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please enter all fields' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE Email = @email');

        const user = result.recordset[0];
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Create Token
        const token = jwt.sign({ userId: user.Id, username: user.Username }, process.env.JWT_SECRET, { expiresIn: '30d' });

        res.json({
            success: true,
            message: 'Logged in successfully',
            data: {
                token,
                userId: user.Id,
                username: user.Username
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

module.exports = router;
