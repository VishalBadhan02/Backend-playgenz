const express = require("express")
const Route = express.Router()
const VenueControl = require(`../controllers/VenueController`)

// Route.post('/cart', verifyJWT, ProductControl.setCart)



// Updated venue routes
Route.get('/getVenue', VenueControl.setVenue);
Route.get('/booking/:bookingId', VenueControl.getPriceDetails)
Route.get('/setSingleVenue/:id', VenueControl.setVenueDetails)


Route.post('/register', VenueControl.setVenueDetails)



module.exports = Route