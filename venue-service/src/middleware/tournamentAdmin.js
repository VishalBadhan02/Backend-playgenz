const tournamentServices = require("../services/tournamentServices");
const reply = require('../helper/reply');
const Lang = require("../language/en");

const checkTournamentAdmin = async (req, res, next) => {
    try {
        const { _id } = req.body;
        const userId = req.user._id;
        const getTournament = await tournamentServices.findTournament(_id)
        if (!getTournament) {
            return res.status(404).json(reply.failure(Lang.TOURNAMENT_NOT_FOUND))
        }
        // Check if user is listed in the tournament's admin array
        const isAdmin = getTournament.admin?.some(
            (adminId) => adminId.toString() === userId.toString()
        );

        if (!isAdmin) {
            return res.status(401).json(reply.failure("Unauthorized access"));
        }

        // User is authorized
        next();

    } catch (error) {
        return res.status(500).json(reply.failure(Lang.SERVER_ERROR))
    }
}

module.exports = {
    checkTournamentAdmin
}