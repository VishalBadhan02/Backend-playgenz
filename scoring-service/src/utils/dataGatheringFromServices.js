const grpcClientService = require("../services/grpcClientService")

const dataGathering = async (data) => {
    try {
        let filteredData = []
        if (data) {
            const userData = await grpcClientService.getUserFromUserService(data)
            filteredData = userData.bulk
        }

        return filteredData

        // if (groups.tournament) {
        //     const tournamentData = await grpcClientService.getTournamentFromTournamentService(groups.tournament)
        // }
        // if (groups.venue) {
        //     const venueData = await grpcClientService.getVenueFromVenueService(groups.venue)
        // }
        // if (groups.score) {
        //     const scoreData = await grpcClientService.getScoreFromScoreService(groups.score)
        // }
    } catch (error) {

    }
}

module.exports = { dataGathering }