require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const NotificationRouter = require('./routes/notification');

const app = express();
const PORT = process.env.PORT || 4008;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Notification Service connected to MongoDB'))
    .catch(err => console.error('❌ DB Connection Error:', err));

// Routes
app.use('/notifications', NotificationRouter);

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Notification Service is running on port ${PORT}`);
});
