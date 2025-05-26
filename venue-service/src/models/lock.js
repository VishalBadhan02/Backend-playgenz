const mongoose = require('mongoose');

const lockSchema = new mongoose.Schema({
    venueId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    bookingDate: {
        type: String,
        required: true
    },
    timeSlot: {
        start: {
            type: Date,
            required: true
        },
        end: {
            type: Date,
            required: true
        }
    },
    expiresAt: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add index for quick lookups and automatic expiration
lockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const LockModel = mongoose.model("locks", lockSchema)


module.exports = { LockModel };