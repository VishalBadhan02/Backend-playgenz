const TournamentTeamsModel = require("../models/tournamentEntry")
const reply = require('../helper/reply');
const { TournamentModel } = require("../models/tournament")
const lang = require('../language/en');
const { RoundModel } = require("../models/tournamentRounds");
const bcrypt = require('bcryptjs');
const tournamentServices = require("../services/tournamentServices");
const grpcClientService = require("../services/grpcServices");
const { formatedTeams } = require("../utils/formatedTeams");
const { FixtureInputValidator } = require("../validators/fixtureValidator");
const { generateFixtures, saveGeneratedFixture } = require("../services/fixtureService");
const TournamentController = require("../fixtures/fixtureControl");
const { getFixtureRound, storeTeamDetails, getTeamDetails, deleteTeamDetails } = require("../services/redisService");
const Lang = require("../language/en");

const handleRegister = async (req, res) => {
    try {
        const { name, admin, password, ...otherTournamentData } = req.body; // Destructure request body
        // console.log(req.body)
        if (name) {
            const existingTournament = await TournamentModel.findOne({ name });
            if (existingTournament) {
                return res.json(reply.failure("Change the name of the tournament, it already exists"));
            }
        }

        const headAdmin = req.user._id;
        const adminList = Array.isArray(admin) ? admin : [];
        adminList.push(headAdmin);

        // Hash the password before saving
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create a new tournament document with the provided data
        const newTournament = new TournamentModel({
            ...otherTournamentData,
            name,
            admin: adminList,
            headAdmin,
            winner: null,
            isVerified: false,
            password: hashedPassword,
        });

        // Save to MongoDB
        await newTournament.save();

        return res.status(201).json(reply.success("Tournament registered successfully! Verification pending", newTournament));
    } catch (error) {
        console.error("Error registering tournament:", error);
        return res.status(500).json({ success: false, message: "Failed to register tournament", error: error.message });
    }
};

const handleTournamentUpdate = async (req, res) => {
    try {
        const { id, ...updateData } = req.body; // Destructure request body
        if (!id) {
            return res.status(400).json(reply.failure("Tournament ID is required"));
        }
        const tournament = await TournamentModel.findById(id);
        if (!tournament) {
            return res.status(404).json(reply.failure("Tournament not found"));
        }
        // Update the tournament document with the provided data
        const updatedTournament = await TournamentModel.findByIdAndUpdate(id, updateData, { new: true });
        return res.status(200).json(reply.success("Tournament updated successfully", updatedTournament));
    } catch (error) {
        console.error("Error updating tournament:", error);
        return res.status(500).json({ success: false, message: "Failed to update tournament", error: error.message });
    }
};

const fetchtournament = async (req, res) => {
    try {
        const tournament = await TournamentModel.find().sort({ rank: "asc" })

        const formateTournament = tournament?.map(value => ({
            id: value?._id,
            name: value?.name,
            startDate: value?.start_date,
            endDate: value?.end_date,
            location: value?.address,
            teams: 0,
            maxTeams: value?.totalTeams,
            registrationOpen: true,
            imageUrl: 'https://via.placeholder.com/400x200'
        }))

        return res.json(reply.success("Tournament fetched successfully", formateTournament))
    } catch (err) {
        res.send(err.message)
    }
}

const setEntry = async (req, res) => {
    try {
        const { id, teamId } = req.body;  // Extract tournament ID from request body
        const user = req.user._id;

        const tournament = await TournamentModel.findOne({ _id: id });

        if (!tournament) {
            console.log("not found")
            return res.status(404).json(reply.failure(lang.TOURNAMENT_NOT_FOUND));
        }

        const entry = new TournamentTeamsModel({
            tournametId: id,
            teamID: teamId,
            userId: user,
            status: 0,
            paymentStatus: "pending"
        });

        await entry.save();

        await deleteTeamDetails(id);

        return res.status(200).json(reply.success(lang.TOURNAMENT_TEAM_REGISTERATION));
    } catch (error) {
        console.error("Error in setEntry:", error);  // Logs error in server
        return res.status(500).json({ message: "Entry not done", error: error.message });
    }
};

const getTournaments = async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const userId = req.user._id;
        // Find tournament and validate
        const tournament = await TournamentModel.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json(reply.failure(lang.TOURNAMENT_NOT_FOUND));
        }

        // Find user's team for this game type
        let hasRegistered = false;


        // If user has a team, check if they're registered for tournament

        const tournamentRegistration = await TournamentTeamsModel.findOne({
            userId: userId,
            tournametId: tournamentId
        });
        hasRegistered = !!tournamentRegistration;


        // Add registration status to tournament object
        const tournamentResponse = {
            ...tournament.toObject(),
            teamId: hasRegistered
        };

        return res.status(200).json(reply.success(
            lang.TOURNAMENT_FETCHED,
            tournamentResponse
        ));

    } catch (err) {
        console.error('Error in getTournaments:', err);
        return res.status(500).json(reply.failure(
            lang.INTERNAL_SERVER_ERROR,
            { error: err.message }
        ));
    }
};

const setTeam = async (req, res) => {
    try {
        const id = req.params.id;
        const query = { tournametId: id }

        const cacheTeams = await getTeamDetails(id)

        // fetching the team's from the database who registered in the tournament
        const data = await tournamentServices.getTournamentTeams(query)

        // extracting the team id's from the modal to make a call;
        const extractedTeamIds = data.map((team) => team.teamID);

        // grpc call to extract teams from the team-service 
        const teams = cacheTeams ? cacheTeams : await grpcClientService.getTeamFromTeamService(extractedTeamIds);

        // storing the teamDetails in the cache if not availeble 
        if (!cacheTeams) {
            await storeTeamDetails(id, teams)
        }

        // formating the data into right formate for further functionalities
        const formattedTournamentTeams = await formatedTeams(teams?.bulk, data);

        const tournament = await tournamentServices.findTournament(id);
        if (!tournament) {
            return res.json(reply.failure("Tournament not found!"))
        }
        const rounds = await RoundModel.findOne({ tournamentId: id }).sort({ createdAt: -1 });
        // console.log("rounds", data)
        if (!tournament) {
            return res.json(reply.failure("Tournament not found!"))
        }

        // for (const element of data) {
        //     const teamMembers = await AddTeamMemberModel.find({ teamId: element.teamID._id, status: 1 });
        //     element.teamID.teamMembers = teamMembers;
        // }
        return res.status(200).json(reply.success("Players Fetched", { teams: formattedTournamentTeams }))
    } catch (error) {
        console.error("Error in setTeam:", error);
        return res.json("error in getting tournament teams", error)
    }
}

const getSelectedRound = async (req, res) => {
    try {
        const { id, round } = req.params;

        const query = {
            tournamentId: id,
            roundNumber: round
        };

        const rounds = await tournamentServices.roundModal(query);
        // console.log("id", rounds.matches)

        if (!rounds) {
            return res.json(reply.failure("Rounds fetched"));
        }

        // await Promise.all(
        //     rounds.map(async (round) => {
        //         await Promise.all(
        //             round.matches.map(async (match) => {
        //                 const scoreCard = await ScoreCardModel.findOne({ matchId: match.id });
        //                 match.scoreCard = scoreCard || null;
        //             })
        //         );
        //     })
        // );
        return res.json(reply.success("Start making fixtures now", rounds));
    } catch (error) {
        return res.json(reply.failure("Error in fetching rounds", error));
    }
};

const UpdateWinner = async (req, res) => {
    try {
        const { id, winner, round, name } = req.body;
        const update = await TournamentFixturesModel.findOneAndUpdate(
            { tournament_id: id, round: round },
            { $push: { winner: { id: winner, name: name } } },
            { new: true }
        );

        if (update) {
            return res.json({ success: true, data: update });
        } else {
            return res.json({ success: false, message: "Tournament not found" });
        }
    } catch (error) {
        return res.json({ success: false, message: "Error in UpdateWinner" });
    }
};

const setFixtures = async (req, res) => {
    try {
        const { tournamentId, regenerate, save, fixtures } = req.body;

        console.log("regenerate", req.body)
        // After preview i user want to re-generate or save the fixtures
        if (regenerate || save || !fixtures) {
            const saveRegen = await saveGeneratedFixture(regenerate, save, tournamentId)
            // console.log("saveRegen", saveRegen)
            if (!saveRegen?.status) {
                console.log("saveRegen", saveRegen)
                return res.status(500).json(reply.failure(saveRegen.message));
            }
            return res.status(202).json(reply.success(Lang.FIXTURE_SUCCESS, saveRegen));
        }

        // validatin for the request
        const parsed = FixtureInputValidator.safeParse(req.body);
        if (!parsed.success) {
            // console.error("Validation errors:", parsed.error.errors);
            return res.status(400).json(reply.failure("Invalid input", parsed.error.errors));
        }

        const { tournamentFormat, randomize, allowByes, startDate, matchesPerDay } = parsed.data.fixtures;
        const result = await generateFixtures(parsed.data);
        // console.log("result", result);

        if (result.error) {
            console.error("Error generating fixtures:", result.error);
            // return res.status(500).json(reply.failure("Error generating fixtures", result.error));
        }
        const tournamentController = new TournamentController(tournamentId, tournamentFormat, result.roundNumber, result.teams, res, allowByes, randomize, startDate, save);
        await tournamentController._generateFixtures();
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json(reply.failure(error.message));
    }
};

const login = async (req, res) => {
    try {
        const { _id, password } = req.body;

        if (!_id || !password) {
            return res.status(400).json(reply.failure("Missing _id or password"));
        }

        const tournament = await tournamentServices.findTournament(_id);

        if (!tournament) {
            return res.status(404).json(reply.failure(lang.TOURNAMENT_NOT_FOUND));
        }

        const isMatch = await bcrypt.compare(password, tournament.password);

        if (!isMatch) {
            return res.status(401).json(reply.failure(lang.PASSWORD_NOTFOUND));
        }

        return res.status(200).json(
            reply.success(lang.TOURNAMENT_FETCHED, {
                id: tournament._id,
            })
        );
    } catch (error) {
        console.error("Login failed:", error);
        return res.status(500).json(reply.failure("Server error during tournament login"));
    }
};

const deleteTeam = async (req, res) => {
    try {
        const id = req.body.id
        const deleteTeam = await TournamentTeamsModel.findOneAndDelete({ teamID: id })
        return res.json(reply.success(lang.TEAM_DELETED))
    } catch (error) {
        return res.json(reply.failure("fail deleting"))
    }
}
// when team is registered here the admin can manage the teams according to the requirement
// like payment status, match status, etc
// this is the function to update the payment status of the team
const updatePayment = async (req, res) => {
    try {
        const { modalId, status, paymentStatus, matchStatus } = req.body;

        if (!modalId) {
            return res.status(400).json(reply.failure("modalId is required"));
        }

        // query for the updates
        const query = {
            $set: {
                ...(status && { status }),
                ...(paymentStatus && { paymentStatus }),
                ...(matchStatus && { matchStatus }),
            },
        };

        // database call to update
        const update = await tournamentServices.updateTournamentTeamModal(modalId, query)

        //!!!! notification is pending
        if (!update) {
            return res.status(404).json(reply.failure("No team found with the provided modalId"));
        }

        return res.status(200).json(reply.success(lang.UPDATE_SUCCESS))
    } catch (error) {
        return res.json(reply.failure("Error Updating payment"))
    }
}

const getUserRegisteredTournament = async (req, res) => {
    try {
        const usrerId = req.user._id
        const bookings = await tournamentServices.fetchUserRegisteredTournaments(usrerId)
        return res.status(200).json(reply.success("", bookings))
    } catch (error) {
        console.log("error fetching usertournament", error);
        return res.status(500).json(reply.failure("Error fetching usertournament"));
    }
}

module.exports = {
    setEntry, setTeam, setFixtures, UpdateWinner, getSelectedRound, login, deleteTeam, getTournaments, updatePayment, handleRegister, fetchtournament, handleTournamentUpdate,
    getUserRegisteredTournament
}
