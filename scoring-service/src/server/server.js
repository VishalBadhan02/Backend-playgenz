require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const ScoreRouter = require('../routes/scoring');
const Config = require('../config');
const verifyJWT = require('../middleware/JWT');

const app = express();
const PORT = Config.PORT || 4009;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(Config.DATABASE.URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Scoring Service connected to MongoDB'))
  .catch(err => console.error('❌ DB Connection Error:', err));

// Routes
app.use('/scoring', verifyJWT, ScoreRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Scoring Service is running on port ${PORT}`);
});
