const reply = require("../helper/reply")
const BookingModal = require("../models/bookingSchema")
const { LockModel } = require("../models/lock")
const VenueModel = require("../models/venue")
const WebSocket = require('ws')


const handleVenueRegistration = async (req, res) => {
    try {

    } catch (error) {
        return res.json(reply.failure("Error in registering venue", error.message));
    }
}

const setVenue = async (req, res) => {
    try {
        const {
            sports,           // String or Array ["cricket", "football"]
            city,            // String "Mumbai"
            price,           // Object { min: 100, max: 1000 }
            available,       // Boolean or String "true"/"false"
            facilities,      // Array ["parking", "floodlights"]
            capacity,        // Object { min: 100, max: 1000 }
            sortBy,         // String "price" or "capacity"
            sortOrder,      // Number 1 or -1
            page = 1,       // Number
            limit = 10      // Number
        } = req.query;
        // Build filter object
        const filter = {};

        // Add sports filter
        if (sports) {
            const sportsArray = Array.isArray(sports) ? sports : [sports];
            filter['sports.value'] = { $in: sportsArray };
        }

        // Add city filter
        if (city) {
            filter['location.city'] = new RegExp(city, 'i');
        }

        // Add price range filter
        if (price) {
            if (price.min || price.max) {
                filter.price = {};
                if (price.min) filter.price.$gte = Number(price.min);
                if (price.max) filter.price.$lte = Number(price.max);
            }
        }

        // Add availability filter
        if (available !== undefined) {
            filter.available = available === 'true';
        }

        // Add facilities filter
        if (facilities) {
            const facilitiesArray = Array.isArray(facilities) ? facilities : [facilities];
            const facilityFilters = facilitiesArray.map(facility => ({
                [`facilities.${facility}`]: true
            }));
            if (facilityFilters.length > 0) {
                filter.$and = facilityFilters;
            }
        }

        // Add capacity range filter
        if (capacity) {
            if (capacity.min || capacity.max) {
                filter.capacity = {};
                if (capacity.min) filter.capacity.$gte = Number(capacity.min);
                if (capacity.max) filter.capacity.$lte = Number(capacity.max);
            }
        }

        // Build sort object
        const sort = {};
        if (sortBy) {
            sort[sortBy] = parseInt(sortOrder) || 1;
        }

        // Calculate skip value for pagination
        const skip = (Math.max(0, parseInt(page) - 1)) * parseInt(limit);

        // Execute query with pagination
        const [venues, total] = await Promise.all([
            VenueModel.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean()
                .select({
                    name: 1,
                    'location.city': 1,
                    'location.state': 1,
                    sports: 1,
                    price: 1,
                    available: 1,
                    capacity: 1,
                    img: 1,
                    operatingHours: 1,
                    is24Hours: 1,
                    facilities: 1
                }),
            VenueModel.countDocuments(filter)
        ]);
        // Calculate pagination info
        const totalPages = Math.ceil(total / parseInt(limit));
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        // Log the query for monitoring
        // console.log(`[${new Date("2025-02-01 08:47:47").toISOString()}] Query executed by ${process.env.CURRENT_USER || 'VishalBadhan02'}`);
        // console.log('Filter:', filter);
        // console.log('Sort:', sort);

        return res.json(reply.success("Venues retrieved successfully", {
            venues,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalVenues: total,
                hasNextPage,
                hasPrevPage,
                limit: parseInt(limit)
            }
        }));

    } catch (error) {
        console.error('Error in setVenue:', error);
        return res.status(500).json(reply.failure("Error in getting venues", error.message));
    }
};

const setVenueDetails = async (req, res) => {
    try {
        const venue = await VenueModel.findOne({ _id: req.params.id });
        if (!venue) {
            return res.json(reply.failure("Venue not found"));
        }

        // Get current date without time
        const currentDate = new Date();
        const nextThirtyDays = new Date();
        nextThirtyDays.setDate(currentDate.getDate() + 30);

        // Get all bookings for this venue in the next 30 days
        const existingBookings = await BookingModal.find({
            venueId: req.params.id,
            bookingDate: {
                $gte: currentDate,
                $lte: nextThirtyDays
            },
            status: {
                $in: ['CONFIRMED', 'PENDING', 'PAYMENT_PENDING']
            }
        }).select('bookingDate timeSlot.start timeSlot.end');

        // Function to convert time string to 24-hour format
        const convertTo24Hour = (timeStr) => {
            const [time, period] = timeStr.split(' ');
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours);

            if (period === 'PM' && hours !== 12) {
                hours += 12;
            } else if (period === 'AM' && hours === 12) {
                hours = 0;
            }

            return `${hours.toString().padStart(2, '0')}:${minutes || '00'}`;
        };

        // Generate time slots based on operating hours
        const generateTimeSlotsForDay = (dayOperatingHours) => {
            const slots = [];
            if (venue.is24Hours) {
                // Generate 24-hour slots
                for (let i = 0; i < 24; i++) {
                    const start = `${i.toString().padStart(2, '0')}:00`;
                    const end = `${(i + 1).toString().padStart(2, '0')}:00`;
                    slots.push({ start, end });
                }
            } else if (dayOperatingHours) {
                const startTime = convertTo24Hour(dayOperatingHours.openingTime);
                const endTime = convertTo24Hour(dayOperatingHours.closingTime);

                const [startHour] = startTime.split(':').map(Number);
                const [endHour] = endTime.split(':').map(Number);

                for (let i = startHour; i < endHour; i++) {
                    const start = `${i.toString().padStart(2, '0')}:00`;
                    const end = `${(i + 1).toString().padStart(2, '0')}:00`;
                    slots.push({ start, end });
                }
            }
            return slots;
        };

        // Generate availability for next 30 days
        const availability = {};
        for (let d = new Date(currentDate); d <= nextThirtyDays; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0];
            const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });

            // Find operating hours for this day
            const dayOperatingHours = venue.operatingHours.find(oh => oh.day === dayOfWeek);

            // Generate slots based on operating hours
            const timeSlots = generateTimeSlotsForDay(dayOperatingHours);

            availability[dateString] = {
                date: dateString,
                availableSlots: [...timeSlots] // Clone the time slots array
            };
        }

        // Remove booked slots
        existingBookings.forEach(booking => {
            const bookingDate = booking.bookingDate.toISOString().split('T')[0];
            const bookingStartHour = booking.timeSlot.start.getHours();
            const bookingEndHour = booking.timeSlot.end.getHours();

            if (availability[bookingDate]) {
                availability[bookingDate].availableSlots = availability[bookingDate].availableSlots.filter(slot => {
                    const slotStartHour = parseInt(slot.start.split(':')[0]);
                    const slotEndHour = parseInt(slot.end.split(':')[0]);
                    return slotStartHour < bookingStartHour || slotEndHour > bookingEndHour;
                });
            }
        });

        // Convert to array and remove dates with no available slots
        const availableDates = Object.values(availability)
            .filter(day => day.availableSlots.length > 0)
            .map(day => ({
                date: day.date,
                slots: day.availableSlots,
                totalSlots: day.availableSlots.length
            }));

        // Get default operating hours from venue's operating hours
        const defaultOperatingHours = venue.is24Hours ?
            { start: "00:00", end: "23:59" } :
            {
                start: convertTo24Hour(venue.operatingHours[0]?.openingTime || "06:00 AM"),
                end: convertTo24Hour(venue.operatingHours[0]?.closingTime || "08:00 PM")
            };

        // Add venue operating hours and other restrictions
        const response = {
            venue,
            availability: {
                dates: availableDates,
                operatingHours: defaultOperatingHours,
                slotDuration: 60, // in minutes
                maxAdvanceBookingDays: 30,
                currentTime: new Date().toISOString().replace('T', ' ').split('.')[0],
                timeZone: "UTC"
            }
        };

        return res.json(reply.success("Venue details fetched successfully", response));

    } catch (error) {
        console.error("Error in setVenueDetails:", error);
        return res.json(reply.failure("Error in getting venue details"));
    }
};

//     try {
//         const venue = await VenueModel.findOne({ _id: req.params.id });
//         if (!venue) {
//             return res.json(reply.failure("Venue not found"));
//         }

//         // Get current date without time
//         const currentDate = new Date();
//         const nextThirtyDays = new Date();
//         nextThirtyDays.setDate(currentDate.getDate() + 30);
//         // Get all bookings for this venue in the next 30 days
//         const existingBookings = await BookingModal.find({
//             venueId: req.params.id,
//             bookingDate: {
//                 $gte: currentDate,
//                 $lte: nextThirtyDays
//             },
//             status: {
//                 $in: ['CONFIRMED', 'PENDING', 'PAYMENT_PENDING']
//             }
//         }).select('bookingDate timeSlot.start timeSlot.end');
//         // Generate available time slots for each day
//         const timeSlots = [
//             { start: '06:00', end: '07:00' },
//             { start: '07:00', end: '08:00' },
//             { start: '08:00', end: '09:00' },
//             { start: '09:00', end: '10:00' },
//             { start: '10:00', end: '11:00' },
//             { start: '11:00', end: '12:00' },
//             { start: '12:00', end: '13:00' },
//             { start: '13:00', end: '14:00' },
//             { start: '14:00', end: '15:00' },
//             { start: '15:00', end: '16:00' },
//             { start: '16:00', end: '17:00' },
//             { start: '17:00', end: '18:00' },
//             { start: '18:00', end: '19:00' },
//             { start: '19:00', end: '20:00' }
//         ];

//         // Generate availability for next 30 days
//         const availability = {};
//         for (let d = new Date(currentDate); d <= nextThirtyDays; d.setDate(d.getDate() + 1)) {
//             const dateString = d.toISOString().split('T')[0];
//             availability[dateString] = {
//                 date: dateString,
//                 availableSlots: [...timeSlots] // Clone the time slots array
//             };
//         }


//         // Remove booked slots
//         existingBookings.forEach(booking => {
//             const bookingDate = booking.bookingDate.toISOString().split('T')[0];
//             const bookingStartHour = booking.timeSlot.start.getHours();
//             const bookingEndHour = booking.timeSlot.end.getHours();

//             if (availability[bookingDate]) {
//                 availability[bookingDate].availableSlots = availability[bookingDate].availableSlots.filter(slot => {
//                     const slotStartHour = parseInt(slot.start.split(':')[0]);
//                     const slotEndHour = parseInt(slot.end.split(':')[0]);
//                     return slotStartHour < bookingStartHour || slotEndHour > bookingEndHour;
//                 });
//             }
//         });



//         // Convert to array and remove dates with no available slots
//         const availableDates = Object.values(availability)
//             .filter(day => day.availableSlots.length > 0)
//             .map(day => ({
//                 date: day.date,
//                 slots: day.availableSlots,
//                 totalSlots: day.availableSlots.length

//             }));
//         // Add venue operating hours and other restrictions
//         const response = {
//             venue,
//             availability: {
//                 dates: availableDates,
//                 operatingHours: {
//                     start: "06:00",
//                     end: "20:00"
//                 },
//                 slotDuration: 60, // in minutes
//                 maxAdvanceBookingDays: 30,
//                 currentTime: "2025-01-29 10:28:36",
//                 timeZone: "UTC"
//             }
//         };

//         return res.json(reply.success("Venue details fetched successfully", response));

//     } catch (error) {
//         console.error("Error in setVenueDetails:", error);
//         return res.json(reply.failure("Error in getting venue details"));
//     }
// };

const handleBooking = async (ws, data, wss) => {
    try {
        const { bookingDate, timeSlot, players, pricing, type, status, venueId } = data.data;

        const startDateTime = new Date(`${bookingDate}T${timeSlot.start}`);
        const endDateTime = new Date(`${bookingDate}T${timeSlot.end}`);

        const isSlotAvailable = await BookingModal.findOne({
            venueId,
            bookingDate,
            'timeSlot.start': startDateTime,
            'timeSlot.end': endDateTime,
            status: { $in: ['PENDING', 'CONFIRMED', 'PAYMENT_PENDING'] }
        });

        if (isSlotAvailable) {
            throw new Error('This slot is no longer available');
        }

        // Validate required fields
        if (!venueId || !bookingDate || !timeSlot) {  // Changed 'date' to 'bookingDate'
            throw new Error('Missing required booking fields');
        }

        // Validate dates
        if (new Date(bookingDate) < new Date("2025-01-29 08:57:18")) {
            throw new Error('Cannot book for past dates');
        }

        if (type === 'locking') {
            const lock = new LockModel({
                venueId,
                bookingDate,
                timeSlot: {
                    start: startDateTime,
                    end: endDateTime
                },
                userId: ws.userId,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes lock
            });
            await lock.save();

            // notifing other users that slot is locked is user try to select this slote
            const notificationPayload = {
                type: 'BOOKING_CONFIRMED',
                data: {
                    venueId,
                    bookingDate,
                    timeSlot: {
                        start: timeSlot.start,
                        end: timeSlot.end
                    }
                }
            };
            if (wss.clients) {
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(notificationPayload));
                    }
                })
            }
            ws.send(JSON.stringify({
                type: 'LOCK_CONFIRMED',
                message: 'Slot locked successfully'
            }));;
        }
        else {
            const gstRate = 0.18;
            const basePrice = pricing.basePrice
            const totalAmount = basePrice + (basePrice * gstRate);

            const lock = await LockModel.findOne({
                venueId,
                bookingDate,
                'timeSlot.start': startDateTime,
                'timeSlot.end': endDateTime,
                userId: ws.userId,
                expiresAt: { $gt: new Date() }
            });

            if (!lock) {
                cons

                throw new Error('Your lock on this slot has expired. Please try booking again.');
            }

            const booking = new BookingModal({
                venueId,
                userId: ws.userId,
                bookingDate,
                timeSlot: {
                    start: `${bookingDate}T${timeSlot.start}`,  // Add the date part
                    end: `${bookingDate}T${timeSlot.end}`
                },
                status: 'PENDING',
                pricing: {
                    basePrice,
                    additionalServices: pricing.additionalServices,
                    gstAmount: basePrice * gstRate,
                    totalAmount: totalAmount
                },
                paymentDetails: {
                    paymentStatus: status || 'PENDING'
                },
                bookingId: `BK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
                players,
                cancellation: ""
            });

            const savedBooking = await booking.save();
            // Send success response back to client
            await LockModel.deleteOne({ _id: lock._id });

            setTimeout(async () => {
                const bookingCheck = await BookingModal.findOne({
                    _id: savedBooking._id,
                    status: 'PAYMENT_PENDING'
                });

                if (bookingCheck) {
                    // If still pending after 30 minutes, update status to EXPIRED
                    bookingCheck.status = 'EXPIRED';
                    await bookingCheck.save();

                    // Notify users that slot is available again
                    const notificationPayload = {
                        type: 'BOOKING_EXPIRED',
                        data: {
                            venueId,
                            bookingDate,
                            timeSlot: {
                                start: timeSlot.start,
                                end: timeSlot.end
                            }
                        }
                    };

                    if (wss.clients) {
                        wss.clients.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify(notificationPayload));
                            }
                        });
                    }
                }
            }, 30 * 60 * 1000); // 30 minutes

            const response = {
                type: 'MAKING_PAYMENT',
                bookingId: savedBooking.bookingId,
                message: 'Booking confirmed successfully'
            };

            ws.send(JSON.stringify(response));


            const notificationPayload = {
                type: 'BOOKING_CONFIRMED',
                data: {
                    venueId,
                    bookingDate,
                    timeSlot: {
                        start: timeSlot.start,
                        end: timeSlot.end
                    }
                }
            };
            if (wss.clients) {
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(notificationPayload));
                    }
                })
            }
        }
    } catch (error) {
        console.error('Booking error:', error);
        // Send error back to client
        ws.send(JSON.stringify({
            type: 'BOOKING_ERROR',
            message: error.message
        }));
    }
};

const handleCanncellation = async (ws, data, wss) => {
    try {
        const { bookingId } = data.data;

        // Find and delete the pending booking
        const canceledBooking = await BookingModal.findOneAndUpdate(
            {
                bookingId: bookingId,
                status: { $in: ['PENDING', 'PAYMENT_PENDING'] }
            },
            {
                status: 'CANCELLED_BY_USER',
                'cancellation.cancelledAt': new Date("2025-01-31 11:25:11"),
                'cancellation.cancelledBy': ws.userId,
                'cancellation.reason': 'User cancelled booking'
            },
            { new: true }
        );

        if (!canceledBooking) {
            throw new Error('Booking not found or already processed');
        }

        // Remove any associated locks
        await LockModel.deleteOne({
            venueId: canceledBooking.venueId,
            userId: ws.userId,
            bookingDate: canceledBooking.bookingDate,
            'timeSlot.start': canceledBooking.timeSlot.start,
            'timeSlot.end': canceledBooking.timeSlot.end
        });

        // Notify all connected clients about the slot becoming available
        const notificationPayload = {
            type: 'SLOT_AVAILABLE',
            data: {
                venueId: canceledBooking.venueId,
                bookingDate: canceledBooking.bookingDate,
                timeSlot: {
                    start: canceledBooking.timeSlot.start,
                    end: canceledBooking.timeSlot.end
                }
            }
        };

        if (wss.clients) {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(notificationPayload));
                }
            });
        }

        // Send confirmation to the user
        ws.send(JSON.stringify({
            type: 'BOOKING_CANCELLED',
            message: 'Booking cancelled successfully'
        }));
    } catch (error) {
        ws.send(JSON.stringify({
            type: 'BOOKING_ERROR',
            message: error.message
        }));
    }
}

const getPriceDetails = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const venue = await BookingModal.findOne({ bookingId, userId: req.user._id });

        if (!venue) {
            return res.json(reply.failure("Booking not found"));
        }
        return res.json(reply.success("Booking found", venue));
    }
    catch (error) {
        console.error("Error in getPriceDetails:", error);
        return res.json(reply.failure("Error in getting price details"));
    }
}



module.exports = {
    setVenue, setVenueDetails, handleBooking, handleCanncellation, getPriceDetails, handleVenueRegistration
}