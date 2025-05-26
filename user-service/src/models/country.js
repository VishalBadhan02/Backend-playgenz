const mongoose = require("mongoose")

const CounterySchema = mongoose.Schema({
    name: String,
    code: String
}, { timestamps: true })

const CountryModel = mongoose.model("countries", CounterySchema)

module.exports = { CountryModel }