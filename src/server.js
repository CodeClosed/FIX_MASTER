const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'ok', server_time: result.rows[0].now });
  } catch (err) {
    console.error('Database query error in /api/health:', err);
    res.status(500).json({ status: 'error', message: err.message || 'Database connection error' });
  }
});

// Mount all API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/dispatch', require('./routes/dispatchRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/meta', require('./routes/metaRoutes'));

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});