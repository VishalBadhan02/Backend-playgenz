const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true // Added index for name searches
    },
    operatingHours: [
        {
            day: {
                type: String,
                enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                required: true
            },
            openingTime: { type: String, required: true },
            closingTime: { type: String, required: true }
        }
    ],
    is24Hours: {
        type: Boolean,
        default: false,
        index: true // Added index for quick filtering of 24/7 venues
    },
    img: {
        type: Array
    },
    location: {
        address: { type: String, required: true, trim: true },
        city: {
            type: String,
            required: true,
            trim: true,
            index: true // Added index for city searches
        },
        state: {
            type: String,
            required: true,
            trim: true,
            index: true // Added index for state searches
        },
        country: { type: String, required: true, trim: true },
        pincode: { type: String, trim: true },
        latitude: { type: Number },
        longitude: { type: Number }
    },
    capacity: {
        type: Number,
        required: true,
        index: true // Added index for capacity searches
    },
    sports: [
        {
            value: {
                type: String,
                enum: ['cricket', 'football', 'hockey', 'tennis', 'basketball', "volleyball"],
                required: true,
                index: true // Added index for sport searches
            },
            name: {
                type: String,
                enum: ['Cricket', 'Football', 'Hockey', 'Tennis', 'Basketball'],
                required: true
            },
            min: Number,
            max: Number,
            dimentions: {
                width: Number,
                length: Number,
                height: Number,
                type: String
            },
            referee: {
                price: Number,
                label: String
            },
            equipmentIncluded: Boolean,
            refereeIncluded: Boolean
        }
    ],
    facilities: {
        floodlights: { type: Boolean, default: false },
        dressingRooms: { type: Number, default: 2 },
        parking: { type: Boolean, default: true },
        restrooms: { type: Boolean, default: true },
        foodStalls: { type: Boolean, default: true },
        scoreboards: {
            digital: { type: Boolean, default: true },
            manual: { type: Boolean, default: false }
        },
        firstAid: { type: Boolean, default: true },
        commentaryBox: { type: Boolean, default: true }
    },
    contact: {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        email: { type: String,   trim: true }
    },
    createdAt: {
        type: Date,
        default: () => new Date("2025-02-01 08:39:34"),
        index: true // Added index for date-based queries
    },
    updatedAt: {
        type: Date,
        default: () => new Date("2025-02-01 08:39:34")
    },
    price: {
        type: Number,
        index: true // Added index for price searches
    },
    available: {
        type: Boolean,
        default: true,
        index: true // Added index for availability searches
    }
}, {
    timestamps: { currentTime: () => new Date("2025-02-01 08:39:34") } // Use consistent timestamp
});

// Compound indexes for common query patterns
venueSchema.index({ 'sports.value': 1, 'location.city': 1 }); // For searching venues by sport and city
venueSchema.index({ price: 1, capacity: 1 }); // For sorting and filtering by price and capacity
venueSchema.index({ available: 1, 'location.city': 1 }); // For finding available venues in a city

// Text index for search functionality
venueSchema.index({
    name: 'text',
    'location.address': 'text',
    'location.city': 'text'
}, {
    weights: {
        name: 10,
        'location.city': 5,
        'location.address': 3
    }
});

// Middleware to update the `updatedAt` field automatically
venueSchema.pre('save', function (next) {
    this.updatedAt = new Date("2025-02-01 08:39:34");
    next();
});

// Add index creation logging
venueSchema.post('index', function () {
    console.log(`Indexes created/updated by ${process.env.CURRENT_USER || 'VishalBadhan02'} at ${new Date("2025-02-01 08:39:34").toISOString()}`);
});

module.exports = mongoose.model('Venue', venueSchema);