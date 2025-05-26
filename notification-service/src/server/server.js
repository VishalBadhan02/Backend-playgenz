require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const NotificationRouter = require('../routes/notification');
const verifyJWT = require('../middlewares/verifyJWT');
const startConsumer = require('../kafka/consumer');
const Config = require('../config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.DATABASE_URL || "mongodb://localhost:27017/notification-db").then(() => console.log('✅ Notification Service connected to MongoDB'))
  .catch(err => console.error('❌ DB Connection Error:', err));

// Routes
app.use('/notifications', verifyJWT, NotificationRouter);



// Start Server
app.listen(Config.PORT, () => {
  console.log(`🚀 Notification Service is running on port ${Config.PORT}`);
  startConsumer();
});
