require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const UserRouter = require('../routes/user');
const verifyJWT = require('../middlewares/verifyJWT');
const router = require('../routes/user');
const Config = require('../config');

const app = express();
const PORT = Config.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(Config.DATABASE.URL).then(() => console.log('✅ User Service connected to MongoDB'))
  .catch(err => console.error('❌ DB Connection Error:', err));

// Routes
app.use('/user', verifyJWT, UserRouter);

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 User Service is running on port ${PORT}`);
});
