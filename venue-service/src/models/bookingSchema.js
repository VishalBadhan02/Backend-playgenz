const { mongoose } = require("mongoose")

const BookingSchema = mongoose.Schema({
    venueId: mongoose.Schema.Types.ObjectId,      // Reference to Venue
    userId: mongoose.Schema.Types.ObjectId,       // Reference to User
    bookingDate: Date,      // "2025-01-29"
    timeSlot: {
        start: Date,
        end: Date         // "2025-01-29 06:00:00"
    },
    status: {
        type: String,
        enum: [
            'PENDING',
            'PAYMENT_PENDING',
            'CONFIRMED',
            'CANCELLED_BY_USER',
            'CANCELLED_BY_ADMIN',
            'PAYMENT_FAILED',
            'EXPIRED'
        ],
        default: 'PENDING'
    },
    pricing: {
        basePrice: Number,
        additionalServices: Number,
        gstAmount: Number,
        totalAmount: Number
    },
    paymentDetails: {
        paymentId: String,
        paymentMethod: String,
        paymentStatus: String,
        transactionId: String,
        paidAt: Date
    },
    cancellation: {
        cancelledAt: Date,
        cancelledBy: mongoose.Schema.Types.ObjectId,  // Reference to User
        reason: String,
        refundStatus: String,
        refundAmount: Number
    },
    bookingId: String,
    players: Number,     // Custom booking ID (e.g., "BK12345678")
    expiresAt: {
        type: Date,
        default: function () {
            if (this.status === 'PENDING' || this.status === 'PAYMENT_PENDING') {
                return new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry
            }
            return null;
        }
    }
}, { timestamps: true });

// Add index for auto-expiration of pending bookings
BookingSchema.index(
    { expiresAt: 1 },
    {
        expireAfterSeconds: 0,
        partialFilterExpression: {
            status: {
                $in: ['PENDING', 'PAYMENT_PENDING']
            }
        }
    }
);

const BookingModal = mongoose.model("venueBookings", BookingSchema);

module.exports = BookingModal;