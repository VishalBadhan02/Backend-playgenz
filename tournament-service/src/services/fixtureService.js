const { Status } = require("@grpc/grpc-js/build/src/constants");
const sendMessage = require("../kafka/producer");
const grpcServices = require("./grpcServices");
const tournamentServices = require("./tournamentServices");
const reply = require('../helper/reply');
const Lang = require("../language/en");
const { getFixtureRound, deleteFixtureRound, deletestoredFixtures, getstoredFixtures, getTeamDetails } = require("./redisService");


const generateFixtures = async (input) => {
    const { tournamentId } = input;

    const query = {
        tournametId: tournamentId,
        status: 1,
        paymentStatus: "confirmed",
        matchStatus: "registered"
    };

    const teams = await tournamentServices.getTournamentTeams(query);

    const cacheTeams = await getTeamDetails(tournamentId)


    // filtering the teamId's to make a grpc call to get the team details
    const teamIds = teams?.map(team => team.teamID);

    // making the grpc call to get the team details
    const teamDetail = cacheTeams ? cacheTeams : await grpcServices.getTeamFromTeamService(teamIds);

    const teamDetails = cacheTeams ? cacheTeams : teamDetail?.bulk

    // console.log("teamIds", teamIds);
    const rematch = teams.filter(team => team.matchStatus === "re-entry");

    if (!teams.length) {
        throw new Error("No teams registered yet!");
    }

    let result = [];
    let roundNumber;

    const roundQuery = {
        tournamentId,
    };

    const round = await tournamentServices.roundModal(roundQuery);
    // console.log("round", round)

    if (!round) {
        roundNumber = 1;
        result = teamDetails?.map((value) => ({
            id: value?.id || "unknown",
            userID: value?.userId || "unknown",
            name: value?.name || "unknown",
            avatar: value?.imageUrl || "unknown"
        }));
        // if (tournamentFormat === "single_elimination") {
        //     await TournamentModel.findByIdAndUpdate(tournamentId, {
        //         $set: {
        //             matches: teams.length - 1,
        //         },
        //     });
        // }
    } else {
        roundNumber = round.roundNumber + 1;

        if (round.winners?.length) {
            result = teamDetails?.map((value) => ({
                id: value?.id || "unknown",
                userID: value?.userId || "unknown",
                name: value?.name || "unknown",
                avatar: value?.imageUrl || "unknown"
            }));
        }

        if (round.byes?.length) {
            result.push(
                ...round.byes.map(teamID => ({
                    id: teamID?._id || "dfkjcn",
                    userID: teamID?.user_id || "dfkjcn",
                    name: teamID?.teamName || "dfkjcn",
                    avatar: teamID?.profilePicture || "dfkjcn"
                }))
            );
        }

        if (rematch?.length) {
            result.push(
                ...rematch.map(team => ({
                    id: team?.teamID?._id || "dfkjcn",
                    userID: team?.teamID?.user_id || "dfkjcn",
                    name: team?.teamID?.teamName || "dfkjcn",
                    avatar: team?.teamID?.profilePicture || "dfkjcn"
                }))
            );
        }
    }

    if (!result.length) {
        throw new Error("No valid teams found for fixtures");
    }

    // Here you would generate the fixtures and store them
    return { roundNumber, teams: result };
};

const saveGeneratedFixture = async (regenerate, save, tournamentId) => {
    if (regenerate) {
        await deleteFixtureRound(tournamentId);
        await deletestoredFixtures(tournamentId);
        return { regenerate: true, message: "Cache deleted successfully", status: true }
    } if (save) {
        // the round that we saved in the cache is being stored in the database
        const chacheRound = await getFixtureRound(tournamentId);
        const chacheFixtures = await getstoredFixtures(tournamentId);

        if (!chacheRound && chacheFixtures) {
            return reply.failure("Empty cache")
        }
        // saving the cached data of round in the database
        const res = await tournamentServices.registerRound(chacheRound);

        if (!res) {
            return reply.failure(Lang.ROUND_REGISTER_FAIL)
        }

        // Now fixtures stored in the cache is being stored in the schema by making grpc or kakfka call
        if (chacheFixtures.length > 0) {
            if (chacheFixtures.length <= 10) {
                // GRPC Call for less then 10 matches
                const res = await grpcServices.ScheduleMatchResponse(chacheFixtures)
                if (!res.matchIds) {
                    console.log("error getting grpc res in fixture service", res)
                    return reply.failure(res.details)
                }
            } else {
                // Kafka Call for more then 10 matches
                await sendMessage("tournament-match-scheduling", chacheFixtures)
                console.log("Kafka message sent successfully");
            }
            return reply.success(Lang.SUCCESS)
        }

    }
}

module.exports = {
    generateFixtures,
    saveGeneratedFixture
};
