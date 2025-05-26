const grpcClientService = require("../services/grpcClientService")

const dataGathering = async (groups) => {
    try {
        let filteredData = []
        if (groups.user) {
            const userData = await grpcClientService.getUserFromUserService(groups.user);
            // console.log("userData", userData)
            if (userData?.bulk) {
                filteredData = userData?.bulk
            }
        }

        if (groups.team || groups.match) {
            groups.team.push(...groups.match)
            groups.team = [...new Set(groups.team)]
            console.log("groups.team", groups)
            const teamData = await grpcClientService.getTeamFromTeamService(groups.team)
            // console.log("teamData", teamData)
            filteredData.push(...teamData.bulk)
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