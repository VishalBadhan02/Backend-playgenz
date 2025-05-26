const Lang = require("../language/en");
const { CityModel } = require("../models/city");
const { CountryModel } = require("../models/country");
const { StateModel } = require("../models/state");
const reply = require("../helper/reply");

const getcountry = async (req, res) => {
    try {
        const country = await CountryModel.find();
        if (!country) {
            return res.status(200).json(reply.failure(Lang.COUNTRY_NOT_FOUND))
        }
        return res.status(200).json(reply.success(Lang.COUNTRY, country))
    } catch (err) {
        return res.status(409).json(reply.failure("Error fething countries"))
    }
}

const getstate = async (req, res) => {
    try {
        const state = await StateModel.find({ country_name: req.params.country });
        if (!state) {
            return res.status(200).json(reply.failure(Lang.STATE_NOT_FOUND))
        }
        return res.status(200).json(reply.success(Lang.STATE, state))

    } catch (err) {
        return res.status(409).json(reply.failure("Error fething states"))
    }
}

const getcity = async (req, res) => {
    try {
        const city = await CityModel.find({
            state_name: req.params.state
        })
        if (!city) {
            return res.status(200).json(reply.failure(Lang.CITY_NOT_FOUND_NOT_FOUND))
        };
        return res.json(reply.success(Lang.CITY, city))

    } catch (err) {
        return res.status(409).json(reply.failure("Error fething states"))
    }
}

module.exports = {
    getcountry,
    getstate,
    getcity,
}