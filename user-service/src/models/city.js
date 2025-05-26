const mongoose = require("mongoose")

const CitySchema = mongoose.Schema({
    id: Number,
    name: String,
    state_id: Number,
    state_code: String,
    state_name: String,
    country_id: Number,
    country_code: String,
    country_name: String,
    latitude: String,
    longitude: String,
    wikiDataId: String,
}, { timestamps: true })

const CityModel = mongoose.model("cities", CitySchema)

module.exports = { CityModel }