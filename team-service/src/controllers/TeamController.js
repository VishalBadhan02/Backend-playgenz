const reply = require('../helper/reply');
const Lang = require('../language/en');
const { TeamModel } = require('../models/team');
const { ScheduledMatchModel } = require('../models/scheduledMatch');
const { AddTeamMemberModel } = require('../models/addTeamMember');
const teamServices = require('../services/teamServices');
const { formatePlayerData, formateTeamData } = require('../utils/formateData');
const { fetchPlayersId } = require('../utils/fetchIds');
const { dataGathering } = require('../utils/dataGatheringFromServices');
const { enrichedTeams } = require('../utils/enrichTeams');
const { getTeamManagement, storeTeamManagement, deleteTeamManagement } = require('../services/redisService');
const Config = require('../config');
const sendMessage = require('../kafka/producer');
const { getUpdateDataByType } = require('../utils/teamMember');
const { createNotificationPayload } = require('../utils/notifications');
const { formatedMatches } = require('../utils/formatedMatches');

const registerTeam = async (req, res) => {
    try {
        const formData = req.body;
        const userId = req.user._id;

        //  checking whether the user already registered in the team with existing game
        const existingteamcheck = await teamServices.checkGameExisting(userId, formData.games)


        if (existingteamcheck) {
            return res.status(402).json(reply.failure(Lang.TEAM_EXIST));
        }

        //check unique name of the team if not unique then return 
        const unique = await teamServices.checkUniqueName(formData?.teamName)

        if (!unique) {
            return res.status(409).json(reply.failure(Lang.UNIQUE_TEAM_NAME));
        }

        //service to register team in database
        const team = await teamServices.handleTeamRegisteation(formData, req.user._id)

        if (!team) {
            return res.status(402).json(reply.failure(team?.message));
        }

        // formating the data to pass in addPlayerInPlayerModal
        const playerdata = await formatePlayerData(userId, userId, req.user?.userName, team._id, 1, "Captain")

        // here user is assinged as a captain for the registered room 
        const player = await teamServices.addPlayerInPlayerModal(playerdata)

        if (!player) {
            return res.status(402).json(reply.failure(team?.message));
        }

        return res.status(201).json(reply.success(Lang.REGISTER_SUCCESS, team._id))

    } catch (err) {
        return res.status(402).json({ error: err.message });
    }
}

const handleAddPlayer = async (req, res) => {
    try {
        const _id = req.user._id;
        const { playerId, teamId } = req.body;
        const playerData = req.body
        const cacheKey = `teamProfile:${teamId}`;

        await deleteTeamManagement(cacheKey)

        const team = teamServices.findTeam(teamId);

        if (!team) {
            return res.status(404).json(reply.failure(Lang.TEAM_NOT_FOUND));
        }

        const addplayer = {
            userId: _id,
            ...playerData
        };

        const player = await teamServices.addPlayerInPlayerModal(addplayer)


        const notificationData = {
            receiverId: playerId,           // Who receives this notification
            actorId: _id,               // Who triggered the action
            type: Config.NOTIF_TYPE_REQUEST,// Type of notification (friend_request)
            entityId: player._id,// ID of the related entity (match, team, tournament, etc.)
            message: Config.NOTIF_MESSAGE,  // Readable message
            status: 1,                 // Status: unread, read, dismissed
            data: {
                type: "friend_request",
                teamName: team?.teamName
            }
        }

        await sendMessage("friend-request", notificationData)

        return res.status(200).json(reply.success(Lang.SUCCESS))
    } catch (err) {
        return res.status(200).json(reply.failure(err.message))
    }
}

const getTeam = async (req, res) => {
    try {
        const { team_A, team_B } = req.params;
        const b = [team_A, team_B];

        const teams = await Promise.all(b.map(teamId => TeamModel.findOne({ _id: teamId }).populate({
            path: 'teamMembers.player_id',
        })))

        if (!teams) {
            return res.json(reply.failure("teams not found"))
        }
        return res.json(reply.success(Lang.TOURNAMENT_FETCHED, teams))

    } catch (error) {
        return res.json(reply.failure("error getting teams"))
    }
}

const manageScore = async (req, res) => {
    try {
        // const { e } = req.body
        // if (e <= 6 || ["Wide", "No Ball", "Byes", "Leg Byes"].includes(e)) {
        //     ScoreHandler.setRuns(req.body)
        // }
        // if (e === "Undo" || e === "Out") {
        //     ScoreHandler.setUndoOut(req.body)
        // }
        // return res.json(reply.success())
    } catch (error) {
        return res.status(400).json("error managing score", error)
    }
}

const getTeamProfile = async (req, res) => {
    const _id = req.params._id;
    const cacheKey = `teamProfile:${_id}`;

    try {
        // Step 1: Check cache
        const cachedData = await getTeamManagement(cacheKey);
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            return res.status(200).json(reply.success(Lang.TEAM_FOUND, parsedData));
        }

        const team = await teamServices.findTeam(_id)

        // simply formating the createddate into string
        const foundedDate = new Date(team?.createdAt).toDateString()

        // fetching the members of the team
        const players = await AddTeamMemberModel.find({ teamId: _id, status: { $lte: 2 } });

        // filtering the userIDs from the playser to get details of user from user service 
        const fetchPlayers = await fetchPlayersId(players)

        // fetching the data from grpc services
        const finalResponse = await dataGathering(fetchPlayers)

        //formating the data in right formate
        const enrichedTeamsData = await enrichedTeams(players, finalResponse)

        if (!team) {
            return res.status(404).json(reply.failure(Lang.TEAM_NOT_FETCHED));
        }

        // simply formating the data for frontend
        const teamData = await formateTeamData(team?._id,
            team?.teamName, team?.games,
            team?.description, team?.addressOfGround,
            foundedDate, team?.logo, "", enrichedTeamsData,
            team?.joinTeam, team?.teamVisibility, team?.memberVisibility,
            team?.openPositions
        )

        // Step 3: Store in Redis
        await storeTeamManagement(cacheKey, teamData);

        return res.status(200).json(reply.success(Lang.TEAM_FOUND, teamData));
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Error fetching team profile", error });
    }
};



const handleMatchRequest = async (req, res) => {
    const { teamId, sport, userId, date, time, venue, notes, playersPerTeam } = req.body;
    let user = req.user._id;
    try {
        const home = await teamServices.checkGameExisting(user, sport)

        if (!home) {
            console.log("here")
            return res.status(200).json(reply.failure(Lang.TEAM_NOT_FOUND));
        }

        const matchData = {
            matchType: "friendly",
            homeTeam: home._id,
            scheduledByUserId: user,
            awayTeam: teamId,
            opponentUserId: userId,
            matchDate: date,
            matchLocation: venue,
            groundName: venue,
            numberOfOvers: time,
            numberOfPlayers: playersPerTeam,
            internalStatus: 0,
            matchStatus: "upcoming",
            sportType: sport,
        }

        const match = await teamServices.ScheduledMatch(matchData)

        console.log()
        if (!match) {
            console.log("dhjiu")
            return res.status(404).json(reply.failure(Lang.MATCH_NOT_SCHEDULED));
        }

        const notificationData = {
            receiverId: userId,
            actorId: user,
            entityId: match?._id,
            type: "match",
            message: Config.CHALLENGE_MESSAGE,  // Readable message
            status: 0,                 // Status: unread, read, dismissed
            data: {
                type: "challenge",
                teamName: home?.teamName,
                sport: home?.games
            }
        };

        await sendMessage("friend-request", notificationData)

        return res.status(200).json(reply.success(Lang.SCHEDULED))

    } catch (error) {
        console.log("Error scheduling match", error);
        return res.status(500).json({ message: "Error scheduling match try again", error });

    }
};


const getTeamsForRequest = async (req, res) => {
    try {
        const { game } = req.params; // Get the game parameter from URL
        const searchTerm = req.query.q || ''; // Get the search query, default to an empty string
        const session_id = req.user._id; // Current user ID

        // Fetch the user's teams
        const userTeams = await teamServices.fetchUserTeams(session_id);

        const excludedTeamIds = userTeams.map((team) => team._id);

        // 2. Build query for teams
        const teamQuery = {
            _id: { $nin: excludedTeamIds },
            ...(game && game !== "All Sports" && { games: game }),
            ...(searchTerm && { teamName: { $regex: `^${searchTerm}`, $options: 'i' } })
        };

        // 3. Fetch teams using service
        const teams = await teamServices.fetchRegisteredTeam(teamQuery, game);


        const scheduledMatches = await ScheduledMatchModel.find({
            $or: [
                { userTeamId: { $in: excludedTeamIds } },
                { opponentId: { $in: excludedTeamIds } }
            ]
        });

        // Create a map for scheduled matches
        const matchMap = {};
        scheduledMatches.forEach((match) => {
            const key = match.userId === session_id ? match.opponentId : match.userTeamId;
            matchMap[key] = match;

        });

        // Add scheduled match data to the teams
        const teamsWithSchedules = teams.map((team) => ({
            ...team.toObject(),
            schedule: matchMap[team._id] || null // Add scheduled match data if available
        }));

        // 6. Add scheduled match info and members count to each team
        const teamsWithDetails = await Promise.all(
            teams.map(async (team) => {
                const members = await teamServices.fetchTeamMembers({ teamId: team._id, status: 1 });
                return {
                    id: team?._id,
                    name: team?.teamName,
                    sport: team?.games,
                    location: team?.addressOfGround,
                    wins: 12,
                    losses: 3,
                    draws: 2,
                    logo: team?.logo,
                    captainName: "John Smith",
                    captainEmail: "john@example.com",
                    level: "Advanced",
                    schedule: matchMap[team._id] || null,
                    teamMembers: members,
                    members: members.length,
                    userId: team?.user_id
                };
            })
        );
        // Send the response
        return res.status(200).json(reply.success(Lang.TEAM_FETCH, teamsWithDetails));
    } catch (err) {
        console.log("in getTeamsForRequest", err)
        return res.status(500).json({ error: err.message });
    }
};

const gamesAndFixtures = async (req, res) => {
    try {
        const data = require("../jsonfiles/GamesAndFixturesType.json")
        if (!data) return res.status(409).json(reply.failure("Games and fixtures not found"))
        // console.log(data)
        return res.status(200).json(reply.success("Games and fixtures fetched", data))
    } catch (error) {
        console.log("error fetching side bars", error)
        return res.status(500).json({ error: err.message });
    }
}



// const getTeams = async (req, res) => {
//     try {
//         const { game } = req.params; // Get the game parameter from URL
//         const searchTerm = req.query.q || ''; // Get the search query, default to an empty string

//         // Fetch the user's teams to exclude their IDs
//         const userTeams = await TeamModel.find({ user_id: req.user._id }, '_id');
//         const excludedTeamIds = userTeams.map((team) => team._id);




//         // Build the dynamic query
//         const query = {
//             _id: { $nin: excludedTeamIds }, // Exclude user's teams
//         };

//         // Add game filter if provided
//         if (game) {
//             query.games = game;
//         }

//         // Add search term filter if provided
//         if (searchTerm) {
//             query.teamName = { $regex: `^${searchTerm}`, $options: 'i' }; // Case-insensitive match
//         }

//         // Fetch teams based on the dynamic query
//         const teams = await TeamModel.find(query);

//         const schedules = await Promise.all(
//             excludedTeamIds.map(async (id) => {
//                 return await ScheduledMatchModel.findOne({
//                     $or: [
//                         { userTeamId: id },
//                         { opponentId: id }
//                     ]
//                 });
//             })
//         );

//         const nonEmptySchedules = schedules.filter(Boolean);

//         // Fetch team members and count for each team
//         const teamsWithMembers = await Promise.all(
//             teams.map(async (team) => {
//                 const members = await AddTeamMemberModel.find({ teamId: team._id, status: 1 });
//                 return {
//                     ...team.toObject(), // Convert mongoose document to plain object
//                     teamMembers: members,
//                     members: members.length
//                 };
//             })
//         );

//         // Send response
//         return res.json(reply.success(Lang.TEAM_FETCH, teamsWithMembers));
//     } catch (err) {
//         return res.status(500).json({ error: err.message });
//     }
// };







const handleTeamMember = async (req, res) => {
    try {
        const { teamId, type, _id } = req.body;

        if (!teamId || !type || !_id) {
            return res.status(400).json(reply.failure("Missing required fields"));
        }

        const query = { _id };

        // Map all possible type updates in one object
        const updateData = getUpdateDataByType(type);


        if (!updateData) {
            return res.status(400).json(reply.failure("Invalid type specified"));
        }

        const update = await teamServices.updateMembersModal(query, updateData);

        if (!update) {
            return res.status(404).json(reply.failure("Member not found or not updated"));
        }
        await deleteTeamManagement(`teamProfile:${teamId}`)
        const receiverId = type === "removed" ? update?.playerId : update?.userId
        // Assume you have playerId, player object, team object from earlier context or DB
        const notificationData = createNotificationPayload({
            receiverId: receiverId,
            actorId: teamId,
            entityId: _id,
            actionType: type
        });

        await sendMessage("friend-request", notificationData)

        return res
            .status(200)
            .json(reply.success(Lang.SUCCESS, "Member updated successfully"));
    } catch (error) {
        console.error("Error in deleteTeamMember:", error);
        return res
            .status(500)
            .json(reply.failure("Error deleting/updating team member"));
    }
};




const updateTeam = async (req, res) => {
    try {
        const { _id, ...formData } = req.body;


        const team = await TeamModel.findOneAndUpdate(
            { _id },
            { $set: formData },
            { new: true } // 🔥 Returns the updated document
        );

        if (!team) {
            return res.json(reply.failure("Team not found"));
        }

        const cacheKey = `teamProfile:${_id}`;

        await deleteTeamManagement(cacheKey);

        return res.json(reply.success(Lang.SUCCESS, team)); // 👈 optional: send updated team
    } catch (error) {
        return res
            .status(500)
            .json(reply.error("Error updating team", error.message));
    }
};


const getMatches = async (req, res) => {
    try {
        const user = req.user._id;

        // Fetch the team IDs directly without intermediate variables
        const teamIds = await AddTeamMemberModel.find({ playerId: user, status: 1 }).distinct('teamId');

        // Fetch matches with sessionId added in one step
        const matches = await teamServices.ScheduledMatches(teamIds, user);

        const formattedMatches = await formatedMatches(matches);

        // console.log("teamIds", matches)

        return res.json(reply.success(Lang.MATCHES_FETCHED, formattedMatches));
    } catch (error) {
        return res.status(500).json(reply.failure(Lang.MATCHES_FETCH_FAILED, error.message));
    }
};


const fetchScoreCards = async (req, res) => {
    try {
        // const scoreCards = await ScoreCardModel.find().sort({ createdAt: 1 })
        // return res.json(reply.success(Lang.MATCHES_FETCHED, scoreCards));
    } catch (error) {
        return res.status(500).json(reply.error(Lang.MATCHES_FETCH_FAILED, error.message));

    }
}


const handleTeamRequest = async (req, res) => {
    try {
        const { request, type, team, teamName } = req.body;
        console.log(req.body)
        // const messageType = (type === "team request") ? "teamRequest" : "Friend Request"
        // let type_id
        // const message = await UserModel.findOne({ _id: req.user._id })
        // const user = await UserModel.findOne({ _id: request });

        // if (type === "team request") {
        //     const reques = new AddTeamMemberModel({
        //         userId: req.user._id,
        //         playerId: request,
        //         userName: user.userName,
        //         teamId: team,
        //         status: 0,
        //         commit: "Player"
        //     });
        //     type_id = reques._id
        //     reques.save();
        // }

        // return res.status(202).json(reply.success())
    } catch (err) {
        res.json({ error: err.message });
    }
}

// const handleApproval = async (req, res) => {
//     try {
//         const { approve, type, teamName, userId } = req.body
//         if (type === "match") {
//             await ScheduledMatchModel.findOneAndUpdate({ _id: approve }, { $set: { status: 1 } });
//         }
//         if (type === "request") {
//             await FriendModel.findOneAndUpdate({ _id: approve }, { $set: { status: 1, commit: "request accepted" } });
//         }
//         if (type === "teamRequest") {
//             await ScheduledMatchModel.findOneAndUpdate({ _id: approve }, { $set: { status: 1, commit: "request accepted" } });
//         }

//         await NotificationModel.findOneAndUpdate({ type_id: approve, status: 0 }, { $set: { status: 1 } });
//         return res.json(reply.success("Approved"))
//     } catch (err) {
//         return res.json(err)
//     }
// }

// const addFriend = async (req, res) => {
//     try {
//         const _id = req.user._id;
//         const { playerId, userName, teamId, type, teamName } = req.body;

//         // const team = await TeamModel.findOne({ teamName });
//         const addplayer = new AddTeamMemberModel({
//             userId: _id,
//             playerId,
//             userName,
//             teamId,
//             status: 1,
//             commit: "Player"
//         });

//         const notif = new NotificationModel({
//             type_id: addplayer._id,
//             user_id: playerId,
//             type: "request",
//             message: `${teamName} added you in team `,
//             status: 1,
//         })
//         notif.save()
//         addplayer.save()
//         return res.json(reply.success(Lang.SUCCESS))
//     } catch (err) {
//         return res.json(err)
//     }
// }

module.exports = {
    getTeam,
    handleTeamRequest,
    manageScore,
    getTeamProfile,
    handleMatchRequest,
    getTeamsForRequest,
    gamesAndFixtures,
    handleTeamMember,
    handleAddPlayer,
    updateTeam, getMatches, fetchScoreCards, registerTeam
}