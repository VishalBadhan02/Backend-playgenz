const { TeamModel } = require("../models/team");
const { AddTeamMemberModel } = require("../models/addTeamMember");
const teamServices = require("../services/teamServices");
const { default: mongoose } = require("mongoose");
const { ScheduledMatchModel } = require("../models/scheduledMatch");

const getTeamByUser = async (call, callback) => {
    try {
        const userId = call.request.userId

        //fetch all the teams which are registered by the user
        const team = await TeamModel.find({ user_id: userId });

        // Extract teamIds from the user's teams
        const teamIds = team.map(team => team._id);

        // Find other teams where the user is a member, excluding their own teams
        const filteredTeams = await AddTeamMemberModel.find({
            teamId: { $nin: teamIds },
            playerId: userId
        });


        // Fetch data for teams where the user is a member but not the owner
        const otherTeamsWithDetails = await Promise.all(filteredTeams.map(async (teamO) => {
            const teamData = await TeamModel.findOne({ _id: teamO.teamId });
            const membersCount = await AddTeamMemberModel.countDocuments({ teamId: teamO.teamId });
            return { ...teamData, status: teamO.status, members: membersCount };
        }));

        // Fetch team members count for each team in parallel
        const teamsWithMembers = await Promise.all(team.map(async (team) => {
            const membersCount = await AddTeamMemberModel.countDocuments({ teamId: team._id });
            return { ...team.toObject(), members: membersCount };
        }));

        const formatTeam = teamsWithMembers?.map((value) => ({
            id: value?._id,
            name: value?.teamName,
            sport: value?.games,
            user_id: userId,
            members: value?.members,
            upcomingMatches: 1,
            wins: 5,
            losses: 3,
            role: 'Captain',
            imageUrl: value?.logo,
            user_id: userId
        }))

        callback(null, { teams: formatTeam, otherTeamsWithDetails });
    } catch (error) {
        console.log("error fetching teams in grpcController of team service", error)
    }

};

const GetTeamIds = async (call, callback) => {
    try {
        const ids = call.request.teams;
        // console.log("ids", ids)
        const validObjectIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
        const nonObjectIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));

        const teams = await TeamModel.find({
            $or: [
                { _id: { $in: validObjectIds } },
                { user_id: { $in: nonObjectIds } }
            ]
        }).select(["teamName", "profilePicture", "_id", "createdAt", "user_id", "games"]);

        const formateTeams = teams?.map((team) => ({
            id: team._id,
            name: team.teamName,
            imageUrl: team.profilePicture,
            createdAt: team.createdAt,
            userId: team.user_id,
            sport: team.games,
        }));

        const extractMembers = await AddTeamMemberModel.find({ teamId: { $in: ids } });
        const members = extractMembers?.map((member) => ({
            id: member._id,
            teamId: member.teamId,
            playerId: member.playerId,
            status: member.status
        }));
        const teamMembers = members?.reduce((acc, member) => {
            if (!acc[member.teamId]) {
                acc[member.teamId] = [];
            }
            acc[member.teamId].push(member);
            return acc;
        }, {});
        const teamsWithMembers = formateTeams?.map((team) => {
            const membersCount = teamMembers[team.id]?.length || 0;
            return { ...team, members: membersCount };
        });
        // console.log("teams", formateTeams)

        return callback(null, { bulk: formateTeams });
    } catch (error) {
        console.log("error fetching teams in grpcController of team service", error)
        // ✅ Only return INTERNAL if there's an actual server error
        return callback({
            code: grpc.status.INTERNAL,
            message: 'Internal server error',
            details: error.message,
        });
    }
}
const handleScheduleMessages = async (call, callback) => {
    try {
        const matche = call.request.matches;
        const matches = await teamServices.bulkMatchScheduling(matche)
        const matchIds = matches.map(match => match._id.toString());
        return callback(null, { matchIds });
    } catch (error) {
        console.log("error fetching teams in grpcController of team service", error)
        // ✅ Only return INTERNAL if there's an actual server error
        return callback({
            code: grpc.status.INTERNAL,
            message: 'Internal server error',
            details: error.message,
        });
    }
}

const getMatchById = async (call, callback) => {
    try {
        const match = await ScheduledMatchModel.findOne({ matchId: call.request.id });

        if (!match) {
            return callback(new Error("Match not found"));
        }

        const teamA = match?.homeTeam;
        const teamB = match?.awayTeam;

        const teamAName = await teamServices.findTeam(teamA)
        const teamBName = await teamServices.findTeam(teamB)

        const teamAData = await teamServices.fetchTeamMembers({ teamId: teamA, status: 1 });
        const teamBData = await teamServices.fetchTeamMembers({ teamId: teamB, status: 1 });

        const mapPlayer = (player) => ({
            teamName: player?.teamId?.teamName || '',
            createdAt: player?.createdAt?.toISOString() || '',
            profilePicture: player?.profilePicture || '',
            playerId: player?.playerId || '',
            commit: player?.commit || '',
            id: player?._id?.toString() || '',
        });

        const response = {
            ...match.toObject(),
            teamA: teamAData.map(mapPlayer),
            teamB: teamBData.map(mapPlayer),
            teamAName: teamAName?.teamName,
            teamBName: teamBName?.teamName
        };

        console.log(response)

        callback(null, { match: response });
    } catch (error) {
        callback(error);
    }
};

const listMatches = async (call, callback) => {
    try {
        const page = call.request.page || 1;
        const limit = call.request.limit || 10;
        const matches = await ScheduledMatchModel.find()
            .skip((page - 1) * limit)
            .limit(limit);
        callback(null, { matches });
    } catch (error) {
        callback(error);
    }
};

module.exports = {
    getTeamByUser,
    GetTeamIds,
    handleScheduleMessages,
    listMatches,
    getMatchById
}