const mongoose = require("mongoose")

const StateSchema = mongoose.Schema({
    id: Number,
    name: String,
    country_id: Number,
    code: String,
    country_name: String,
    state_code: String,
    type: String,
    latitude: String,
    longitude: String,
}, { timestamps: true })

const StateModel = mongoose.model("states", StateSchema)

module.exports = { StateModel }