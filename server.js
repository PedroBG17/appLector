const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/userRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/reading', require('./routes/readingRoutes'));
app.use('/api/translation', require('./routes/translationRoutes'));

// Root test route
app.get('/', (req, res) => {
    res.send('Applector Node.js API is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
