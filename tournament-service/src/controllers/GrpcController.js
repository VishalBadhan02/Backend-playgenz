const { TournamentModel } = require("../models/tournament");
const tournamentServices = require("../services/tournamentServices");

/**
 * Converts a Mongoose tournament document into the gRPC-compatible format
 */
function toProtoTournament(doc) {
    return {
        id: doc._id.toString(),
        name: doc.name,
        poster: doc.poster || "",
        sport: doc.sport,
        tournament_mode: doc.tournamentMode,
        fixture_type: doc.fixtureType,
        start_date: doc.start_date.toISOString(),
        end_date: doc.end_date.toISOString(),
        total_teams: doc.totalTeams,
        location: {
            country: doc.country,
            state: doc.state,
            city: doc.city
        },
        entry_fee: doc.entryFee,
        prizes: {
            first_price: doc.prizes.firstPrice,
            second_price: doc.prizes.secondPrice,
            third_price: doc.prizes.thirdPrice
        },
        status: doc.status || "",
        is_verified: doc.isVerified,
        winner: doc.winner || "",
        created_at: doc.createdAt.toISOString(),
        updated_at: doc.updatedAt.toISOString()
    };
}

/**
 * Get a single tournament by ID
 */
async function GetTournament(call, callback) {
    try {
        const id = call.request.id;
        const tournament = await TournamentModel.findById(id);

        if (!tournament) {
            return callback(new Error("Tournament not found"), null);
        }

        const protoTournament = toProtoTournament(tournament);
        callback(null, { tournament: protoTournament });
    } catch (err) {
        callback(err, null);
    }
}

/**
 * List multiple tournaments (with optional pagination)
 */
async function ListTournaments(call, callback) {
    try {
        const page = call.request.page || 1;
        const limit = call.request.limit || 10;
        const skip = (page - 1) * limit;

        const tournaments = await TournamentModel.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const protoTournaments = tournaments.map(toProtoTournament);
        callback(null, { tournaments: protoTournaments });
    } catch (err) {
        callback(err, null);
    }
}

const getMatchById = async (call, callback) => {
    try {
        const { tournamentId, matchId, status } = call.request;

        const updatedRound = await tournamentServices.updateRoundModal(
            tournamentId,
            matchId,
            status // or 'completed', 'paused', etc.
        );

        if (!updatedRound) {
            return callback({ code: grpc.status.NOT_FOUND, message: "Match not found" });
        }

        return callback(null, { status: true });

    } catch (error) {
        callback(err, null);
    }
}

module.exports = {
    GetTournament,
    ListTournaments,
    getMatchById
};
