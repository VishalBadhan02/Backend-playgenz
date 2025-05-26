require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const VenueRouter = require('../routes/venue');
const verifyJWT = require('../middleware/JWT');
const Config = require('../config');

const app = express();
const PORT = Config.PORT || 4008;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ Venue Service connected to MongoDB'))
    .catch(err => console.error('❌ DB Connection Error:', err));

// Routes
app.use('/venue', verifyJWT, VenueRouter);

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Venue Service is running on port ${PORT}`);
});
