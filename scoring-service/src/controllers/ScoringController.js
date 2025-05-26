const reply = require('../helper/reply');
const Lang = require("../language/en");
// const { AddTeamMemberModel } = require('../model/addTeamMember');
// const { ScheduledMatchModel } = require('../model/scheduledMatch');
// const { ScoreCardModel } = require('../models/socreCard');
// const { TournamentModel } = require('../model/tournament');
const WebSocket = require('ws');
const { getTournament, getMatch, getUsers, updateFixtureRound } = require('../services/grpcService');
const { formatedMatches, formateScorecardData } = require('../utils/formatedScorecard');
const scorecardService = require('../services/scorecardService');
const { storeUsers, getCacheUsers } = require('../services/redisService');
const { enrichedUserData } = require('../utils/enrichedUserData');
const { duplicatePlayerDetail } = require('../utils/duplicatePlayerDetails');
const sendMessage = require('../kafka/producer');
// const TournamentTeamsModel = require('../model/tournamentEntry');

const ScoreCard = async (req, res) => {
    try {
        const { matchId, teamA, teamB, tournamentId } = req.body;

        // console.log("id", req.body)
        const currentTime = new Date();
        let match;
        // Attempt to find the tournament first
        // const tournament = await getTournament(tournamentId);
        const scheduledMatch = await getMatch(matchId);

        let total_over = scheduledMatch?.numberOfOvers;
        let sportType = scheduledMatch?.sportType
        let players = scheduledMatch?.numberOfPlayers
        match = scheduledMatch?.matchId

        if (!isValidSportType(sportType) || !total_over || !players) {
            return res.status(404).json(reply.failure("Invalid sport type"));
        }

        // Get players for both teams
        const teamAPlayers = scheduledMatch?.teamA
        const teamBPlayers = scheduledMatch?.teamB

        // Filtering out the userId's/ playerId's from both teams
        const teamAPlayerIds = teamAPlayers.map(player => player.playerId);
        const teamBPlayerIds = teamBPlayers.map(player => player.playerId);

        // users details stored in redis
        const userIn = await getCacheUsers(matchId)

        // Fetch user details from the database if not found in cache
        const userIndo = userIn ? userIn : await getUsers(teamAPlayerIds.concat(teamBPlayerIds));

        // Store user details in Redis if not already present
        if (!userIn) {
            await storeUsers(matchId, userIndo)
        }

        const userMap = new Map();

        userIndo.forEach(user => {
            userMap.set(user._id.toString(), user); // id here is same as playerId
        });

        const enrichedTeamA = await enrichedUserData(userMap, teamAPlayers);
        const enrichedTeamB = await enrichedUserData(userMap, teamBPlayers);

        // Find duplicates using intersection
        const duplicatePlayers = teamAPlayerIds.filter(playerId =>
            teamBPlayerIds.includes(playerId)
        );

        if (duplicatePlayers.length > 0) {
            // Get player details for better error message
            const duplicatePlayerDetails = duplicatePlayerDetail(duplicatePlayers, userMap);

            return res.status(202).json(reply.success(
                "Players cannot be in both teams",
                duplicatePlayerDetails
            ));
        }

        if (scheduledMatch?.matchType === "tournament") {
            // Fetch current playersParticipations
            await sendMessage("team_player_joined_tournament", {
                tournamentId,
                teams: [teamA, teamB],
                players: [...teamAPlayers, ...teamBPlayers]
            })

        }

        // Initialize the scorecard with the new schema structure
        const formatedScoreard = formatedMatches(matchId, match, enrichedTeamA, teamA, sportType, tournamentId, teamB, enrichedTeamB, currentTime, total_over, players, scheduledMatch?.teamAName, scheduledMatch?.teamBName);


        // storing the scorecard in the database
        const scoreCard = await scorecardService.setScorecard(formatedScoreard)

        if (!scoreCard) {
            console.log("SDSDSsdfc")
        }

        const query = {
            matchId,
            tournamentId,
            status: "in_progress"
        }
        const response = await updateFixtureRound(query)

        if (!response) {
            return res.status(400).json(reply.failure("Scorecard initialized"));
        }

        return res.status(200).json(reply.success("Scorecard initialized", scoreCard.matchId));
    } catch (error) {
        console.error("Error initializing scorecard:", error);
        return res.status(500).json(reply.failure("Failed handling score card"));
    }
};

// Helper function to validate sport type
const isValidSportType = (sport) => {
    return ['cricket', 'football', 'basketball', 'volleyball'].includes(sport);
};


const getScore = async (req, res) => {
    try {
        const { id } = req.params;
        const score = await scorecardService.getScorecard({ matchId: id })

        if (!score) {
            return res.status(404).json(reply.failure(Lang.SCORE_NOT_FOUND));
        }

        // Transform Map objects to regular objects for JSON serialization
        const transformedScore = {
            ...score,
            sportSpecificDetails: Object.fromEntries(
                score.sportSpecificDetails instanceof Map
                    ? score.sportSpecificDetails
                    : new Map(Object.entries(score.sportSpecificDetails))
            ),
            matchStatistics: Object.fromEntries(
                score.matchStatistics instanceof Map
                    ? score.matchStatistics
                    : new Map(Object.entries(score.matchStatistics))
            ),
            // Add metadata about the current state
            metadata: {
                ...score.metadata,
                lastFetched: new Date("2025-01-15 15:25:45").toISOString(),
                fetchedBy: req.user.userName
            }
        };

        // Add computed statistics
        if (transformedScore.sportType === 'cricket') {
            transformedScore.computedStats = {
                currentRunRate: calculateRunRate(transformedScore),
                requiredRunRate: calculateRequiredRunRate(transformedScore),
                projectedScore: calculateProjectedScore(transformedScore)
            };
        }

        const transformedData = await formateScorecardData(transformedScore)


        return res.status(200).json(reply.success(Lang.SCORE_FETCHED, transformedData));

    } catch (error) {
        console.log("error occuring in get score", error)
        return res.status(500).json(reply.failure("Error fetching scorecard details"));
    }
};

// Helper functions for cricket statistics
const calculateRunRate = (score) => {
    const currentInningDetails = score.sportSpecificDetails.currentInning || {};
    const runs = currentInningDetails.runs || 0;
    const overs = currentInningDetails.overs || 0;
    return overs > 0 ? (runs / overs).toFixed(2) : 0;
};

const calculateRequiredRunRate = (score) => {
    if (score.currentPeriod.periodNumber !== 2) return 0;

    const target = score.sportSpecificDetails.target;
    const currentScore = score.teams.teamB.score;
    const remainingRuns = target - currentScore;
    const totalOvers = score.sportSpecificDetails.totalOvers;
    const currentOver = score.sportSpecificDetails.currentOver;
    const remainingOvers = totalOvers - currentOver;

    return remainingOvers > 0 ? (remainingRuns / remainingOvers).toFixed(2) : 0;
};

const calculateProjectedScore = (score) => {
    const currentInningDetails = score.sportSpecificDetails.currentInning || {};
    const currentRunRate = calculateRunRate(score);
    const remainingOvers = score.sportSpecificDetails.totalOvers - (currentInningDetails.overs || 0);
    const currentScore = currentInningDetails.runs || 0;

    return Math.round(currentScore + (currentRunRate * remainingOvers));
};

const handleScore = async (req, res) => {
    try {
        const { matchId, tossWinner, tossWinnerName, sportSpecificDetails } = req.body;
        const currentTime = new Date("2025-01-15 16:10:06");
        const currentUser = req.user.userName;

        // Find the existing scorecard
        const scoreCard = await scorecardService.getScorecard({ matchId });
        if (!scoreCard) {
            return res.status(404).json(reply.failure("Scorecard not found"));
        }

        // If tossWinner is provided, update toss details
        if (tossWinner) {
            // Update toss winner details
            scoreCard.sportSpecificDetails.set('tossWinner', tossWinner);
            scoreCard.sportSpecificDetails.set('tossWinnerName', sportSpecificDetails.tossWinnerName);
            scoreCard.sportSpecificDetails.set('tossTime', currentTime);
            scoreCard.matchStatus = 'toss_completed';
        }

        // If inningChoice is provided in sportSpecificDetails
        if (sportSpecificDetails?.inningChoice) {
            const tossWinnerTeam = scoreCard.sportSpecificDetails.get('tossWinner');
            const otherTeamId = tossWinnerTeam === scoreCard.teams.teamA.teamId.toString()
                ? scoreCard.teams.teamB.teamId
                : scoreCard.teams.teamA.teamId;


            // Determine batting and bowling teams
            const battingTeamId = sportSpecificDetails.inningChoice === 'Bat'
                ? tossWinnerTeam
                : otherTeamId;

            const bowlingTeamId = sportSpecificDetails.inningChoice === 'Ball'
                ? tossWinnerTeam
                : otherTeamId;

            // Update match details
            scoreCard.sportSpecificDetails.set('inningChoice', sportSpecificDetails.inningChoice);
            scoreCard.sportSpecificDetails.set('battingTeam', battingTeamId);
            scoreCard.sportSpecificDetails.set('bowlingTeam', bowlingTeamId);
            scoreCard.sportSpecificDetails.set('currentInning', 1);
            scoreCard.matchStatus = 'innings_setup';

            // Initialize first innings details
            scoreCard.sportSpecificDetails.set('firstInnings', {
                battingTeam: battingTeamId,
                bowlingTeam: bowlingTeamId,
                totalScore: 0,
                wickets: 0,
                overs: 0,
                balls: 0,
                extras: {
                    wides: 0,
                    noBalls: 0,
                    byes: 0,
                    legByes: 0
                }
            });
            scoreCard.sportSpecificDetails.set('secondInnings', {
                battingTeam: bowlingTeamId,
                bowlingTeam: battingTeamId,
                totalScore: 0,
                wickets: 0,
                overs: 0,
                balls: 0,
                extras: {
                    wides: 0,
                    noBalls: 0,
                    byes: 0,
                    legByes: 0
                }
            });

            // Add to match timeline
            if (scoreCard.timeline) {
                scoreCard.timeline.push({
                    time: currentTime,
                    updatedBy: currentUser,
                    action: 'INNINGS_CHOICE',
                    details: {
                        choice: sportSpecificDetails.inningChoice,
                        battingTeam: battingTeamId,
                        bowlingTeam: bowlingTeamId
                    }
                });
            }

            // Update metadata
            if (scoreCard.metadata) {
                scoreCard.metadata.lastUpdateTime = currentTime;
                scoreCard.metadata.updatedBy = currentUser;
            }
        }

        // Save the updated scorecard
        await scoreCard.save();

        // Prepare response data
        const responseData = {
            matchStatus: scoreCard.matchStatus,
            tossWinner: scoreCard.sportSpecificDetails.get('tossWinner'),
            tossWinnerName: scoreCard.sportSpecificDetails.get('tossWinnerName'),
            inningChoice: scoreCard.sportSpecificDetails.get('inningChoice'),
            battingTeam: scoreCard.sportSpecificDetails.get('battingTeam'),
            bowlingTeam: scoreCard.sportSpecificDetails.get('bowlingTeam'),
            currentInning: scoreCard.sportSpecificDetails.get('currentInning')
        };

        return res.json(reply.success("Scorecard updated successfully", responseData));

    } catch (error) {
        return res.status(500).json(reply.failure("Error updating scorecard"));
    }
};

const handlePlayerSelection = async (req, res) => {
    // try {
    //     const { matchId, sportSpecificDetails } = req.body;
    //     const currentTime = new Date("2025-01-15 18:05:02");
    //     const currentUser = req.user._id || "Unknown";
    //     // Find the scorecard
    //     const scoreCard = await ScoreCardModel.findById(matchId);
    //     if (!scoreCard) {
    //         return res.status(404).json(reply.failure("Scorecard not found"));
    //     }

    //     // Get current selection stage  
    //     const stage = getSelectionStage(scoreCard);
    //     // Update player based on stage
    //     await updatePlayer(scoreCard, sportSpecificDetails, stage, currentTime, currentUser);

    //     await scoreCard.save();

    //     return res.json(reply.success("Player updated successfully", {
    //         matchStatus: scoreCard.matchStatus,
    //         stage: stage,
    //         battingTeam: scoreCard.sportSpecificDetails.get('battingTeam'),
    //         bowlingTeam: scoreCard.sportSpecificDetails.get('bowlingTeam'),
    //         striker: scoreCard.sportSpecificDetails.get('striker'),
    //         nonStriker: scoreCard.sportSpecificDetails.get('nonStriker'),
    //         bowler: scoreCard.sportSpecificDetails.get('currentBowler')
    //     }));

    // } catch (error) {
    //     return res.status(500).json(reply.failure("Error updating player"));
    // }
};

// Helper function to get current selection stage
const getSelectionStage = (scoreCard) => {
    if (!scoreCard.sportSpecificDetails.get('striker')) return 'striker';
    if (!scoreCard.sportSpecificDetails.get('nonStriker')) return 'nonStriker';
    if (!scoreCard.sportSpecificDetails.get('currentBowler')) return 'currentBowler';
    return 'complete';
};

// Helper function to update player
const updatePlayer = async (scoreCard, player, stage, currentTime, currentUser) => {
    // Validate player eligibility
    //work has to be done her about currenent Striker 
    const isEligible = await validatePlayerEligibility(scoreCard, player.currentstriker.playerId, stage);
    // console.log(isEligible)
    if (!isEligible.success) {
        throw new Error(isEligible.message);
    }

    // Base player stats
    const playerStats = new Map([
        ['runs', 0],
        ['balls', 0],
        ['fours', 0],
        ['sixes', 0],
        ['status', 'playing']
    ]);

    // Update based on stage
    switch (stage) {
        case 'striker':
        case 'nonStriker':
            scoreCard.sportSpecificDetails.set(stage, {
                playerId: player.currentstriker.playerId,
                name: player.currentstriker.playerName,
                stats: playerStats
            });
            break;
        case 'currentBowler':
            scoreCard.sportSpecificDetails.set('currentBowler', {
                playerId: player.currentstriker.playerId,
                name: player.currentstriker.playerName,
                stats: new Map([
                    ['overs', 0],
                    ['maidens', 0],
                    ['runs', 0],
                    ['wickets', 0],
                    ['balls', 0],
                ])
            });
            break;
    }

    // Update match status if all players are selected
    updateMatchStatus(scoreCard);

    // Add to timeline
    if (scoreCard.timeline) {
        scoreCard.timeline.push({
            time: currentTime,
            user: currentUser,
            action: `SET_${stage.toUpperCase()}`,
            details: {
                playerId: player.playerId,
                name: player.userName,
                role: stage
            }
        });
    }
};

// Helper function to validate player eligibility
const validatePlayerEligibility = async (scoreCard, playerId, stage) => {
    const periodNumber = scoreCard.currentPeriod.periodNumber;
    const sportDetails = scoreCard.sportSpecificDetails;

    const battingTeamId = periodNumber === 1 ? sportDetails.get('battingTeam') : sportDetails.get('bowlingTeam');
    const bowlingTeamId = periodNumber === 1 ? sportDetails.get('bowlingTeam') : sportDetails.get('battingTeam');

    // Check if player is already selected
    const striker = sportDetails.get('striker');
    const nonStriker = sportDetails.get('nonStriker');
    const bowler = sportDetails.get('currentBowler');
    if (striker?.playerId == playerId || nonStriker?.playerId == playerId || bowler?.playerId == playerId) {
        return { success: false, message: "Player already selected" };
    }

    // Validate team membership
    const isBattingRole = stage === 'striker' || stage === 'nonStriker';
    let team;
    if (isBattingRole) {
        team = battingTeamId == scoreCard.teams.teamA.teamId.toString() ? scoreCard.teams.teamA : scoreCard.teams.teamB;
    } else {
        team = bowlingTeamId == scoreCard.teams.teamA.teamId.toString() ? scoreCard.teams.teamA : scoreCard.teams.teamB;
    }
    // Ensure player exists and is not out
    const playerExists = team.players.some(p => {
        const status = p.statistics?.status;
        return p.playerId.toString() === playerId && (!status || status !== 'out');
    });

    return {
        success: playerExists,
        message: playerExists ? 'Player eligible' : 'Player not eligible'
    };
};

// Helper function to update match status
const updateMatchStatus = (scoreCard) => {
    const hasAllPlayers =
        scoreCard.sportSpecificDetails.get('striker') &&
        scoreCard.sportSpecificDetails.get('nonStriker') &&
        scoreCard.sportSpecificDetails.get('currentBowler');

    scoreCard.matchStatus = hasAllPlayers ? 'in_progress' : 'innings_setup';
    if (hasAllPlayers) {
        scoreCard.sportSpecificDetails.set('gameStatus', 'playing');
    }
};

async function ScoreUpdate(ws, data, wss) {
    // try {
    //     const { matchId, data: scoreData, sequenceNumber, timestamp, updatedBy } = data;
    //     const { type, value, extraType, playerId } = scoreData;
    //     // Fetch the scorecard from the database   
    //     const scorecard = await ScoreCardModel.findOne({ _id: matchId }).populate('teams.teamA.teamId')  // Populate team A details
    //         .populate('teams.teamB.teamId');
    //     if (!scorecard) {
    //         console.error('Scorecard not found for matchId:', matchId);
    //         return;
    //     }

    //     // Determine which team the player belongs to
    //     const teamKey = ['teamA', 'teamB'].find(teamKey =>
    //         scorecard.teams[teamKey].players.some(p => p.playerId.equals(playerId))
    //     );

    //     if (!teamKey) {
    //         console.error('Player not found in any team:', playerId);
    //         return;
    //     }
    //     // Convert sportSpecificDetails Map to Object
    //     const sportSpecificDetailsObj = Object.fromEntries(scorecard.sportSpecificDetails);


    //     // console.log("curent", Math.floor(sportSpecificDetailsObj.currentOver))

    //     if (type == "undo") {
    //         console.log("here")
    //         await scorecard.undo();
    //         return res.send('Last change undone');
    //     }

    //     // Handle different types of events
    //     if (type === 'score') {

    //         // Update the player's statistics
    //         const playerStats = {
    //             runs: value,
    //             order: value,
    //             balls: 1 // Add one ball faced
    //         };
    //         await scorecard.updatePlayerStats(scorecard.teams[teamKey].teamId, playerId, playerStats);

    //         // Update the team's score

    //         // Update current bowler statistics if applicable
    //         if (sportSpecificDetailsObj.currentBowler && sportSpecificDetailsObj.currentBowler.playerId) {
    //             const bowlerId = sportSpecificDetailsObj.currentBowler.playerId;
    //             const bowlerStats = {
    //                 runsConceded: value,
    //                 ballsConceded: 1,
    //                 orderConceded: value,
    //                 type: "bowler"
    //             };
    //             await scorecard.updatePlayerStats(scorecard.teams[teamKey === 'teamA' ? 'teamB' : 'teamA'].teamId, bowlerId, bowlerStats);

    //             // Update current bowler's stats in sportSpecificDetails
    //             sportSpecificDetailsObj.currentBowler.stats.runs += value;
    //             sportSpecificDetailsObj.currentBowler.stats.balls += 1;
    //             if (!Array.isArray(sportSpecificDetailsObj.currentBowler.stats.order)) {
    //                 sportSpecificDetailsObj.currentBowler.stats.order = [];
    //             }
    //             sportSpecificDetailsObj.currentBowler.stats.order.push(value);
    //         } else {
    //             console.error('Current bowler information is missing or incomplete');
    //         }

    //         // Handle strike rotation if runs are odd


    //         // Update the striker's stats in sportSpecificDetails
    //         if (sportSpecificDetailsObj.striker && sportSpecificDetailsObj.striker.playerId === playerId) {
    //             sportSpecificDetailsObj.striker.stats.runs += value;
    //             sportSpecificDetailsObj.striker.stats.balls += 1;

    //             // Handle boundary cases
    //             if (value === 4) {
    //                 sportSpecificDetailsObj.striker.stats.fours += 1;
    //             } else if (value === 6) {
    //                 sportSpecificDetailsObj.striker.stats.sixes += 1;
    //             }
    //         }

    //         if (value % 2 !== 0) {
    //             const { striker, nonStriker } = sportSpecificDetailsObj;

    //             // Rotate the striker and non-striker
    //             sportSpecificDetailsObj.striker = nonStriker;
    //             sportSpecificDetailsObj.nonStriker = striker;
    //         }

    //         // Handle over completion
    //         const currentOver = sportSpecificDetailsObj.currentOver || 0;
    //         const ballsThisOver = Math.floor((currentOver % 1) * 10); // Get the decimal part as balls bowled in this over
    //         if (ballsThisOver + 1 >= 6) {

    //             // Over is completed    
    //             sportSpecificDetailsObj.currentOver = Math.floor(currentOver) + 1; // Increment over

    //             // Update the current bowler
    //             sportSpecificDetailsObj.currentBowler = null;
    //             scorecard.matchStatus = "innings_setup";

    //             // Rotate the striker and non-striker
    //             const { striker, nonStriker } = sportSpecificDetailsObj;
    //             sportSpecificDetailsObj.striker = nonStriker;
    //             sportSpecificDetailsObj.nonStriker = striker;
    //         } else {
    //             // Increment the ball count in the current over
    //             sportSpecificDetailsObj.currentOver += 0.1;
    //         }


    //     } else if (type === 'out') {
    //         // Handle wicket event
    //         const { striker, nonStriker, currentBowler } = sportSpecificDetailsObj;

    //         // Update the out player's stats
    //         if (striker && striker.playerId === playerId) {
    //             striker.stats.status = 'out';
    //             const StrikerStats = {
    //                 status: "out"
    //             }
    //             await scorecard.updatePlayerStats(scorecard.teams[teamKey === 'teamA' ? 'teamA' : 'teamB'].teamId, playerId, StrikerStats);
    //             sportSpecificDetailsObj.striker = null;
    //         } else if (nonStriker && nonStriker.playerId === playerId) {
    //             nonStriker.stats.status = 'out';
    //             const nonStrikerStats = {
    //                 status: "out"
    //             }
    //             await scorecard.updatePlayerStats(scorecard.teams[teamKey === 'teamA' ? 'teamA' : 'teamB'].teamId, playerId, nonStrikerStats);
    //             sportSpecificDetailsObj.nonStriker = null; // Prompt user to select new batsman
    //         }
    //         scorecard.matchStatus = "innings_setup"
    //         // Increment wicket count for the bowler
    //         if (currentBowler && currentBowler.playerId) {
    //             currentBowler.stats.wickets = (currentBowler.stats.wickets || 0) + 1;
    //             if (!Array.isArray(sportSpecificDetailsObj.currentBowler.stats.order)) {
    //                 sportSpecificDetailsObj.currentBowler.stats.order = [];
    //             }
    //             sportSpecificDetailsObj.currentBowler.stats.order.push("W");
    //             const bowlerStats = {
    //                 wickets: 1
    //             }
    //             await scorecard.updatePlayerStats(scorecard.teams[teamKey === 'teamA' ? 'teamB' : 'teamA'].teamId, currentBowler.playerId, bowlerStats);
    //         }
    //         const outmatchStats = {
    //             wickets: 1
    //         }
    //         await scorecard.updateMatchStats(outmatchStats);

    //         // Increment team wicket count
    //         scorecard.teams[teamKey].wickets = (scorecard.teams[teamKey].wickets || 0) + 1;
    //     }
    //     else if (type === 'extra') {
    //         // Handle extras
    //         const { striker, nonStriker, currentBowler } = sportSpecificDetailsObj;
    //         if (!Array.isArray(sportSpecificDetailsObj.currentBowler.stats.order)) {
    //             sportSpecificDetailsObj.currentBowler.stats.order = [];
    //         }

    //         // Update the team's score
    //         if (value % 2 !== 0) {
    //             // const { striker, nonStriker } = sportSpecificDetailsObj;

    //             // Rotate the striker and non-striker
    //             sportSpecificDetailsObj.striker = nonStriker;
    //             sportSpecificDetailsObj.nonStriker = striker;
    //         }
    //         const outmatchStats = {
    //             extras: extraType,
    //         }

    //         await scorecard.updateMatchStats(outmatchStats);


    //         // Update current bowler statistics if applicable
    //         if (sportSpecificDetailsObj.currentBowler && sportSpecificDetailsObj.currentBowler.playerId) {
    //             const bowlerId = sportSpecificDetailsObj.currentBowler.playerId;
    //             const bowlerStats = {
    //                 runsConceded: value,
    //                 // balls: 1 // Add one ball bowled unless it's a wide or no-ball
    //             };
    //             if (extraType !== 'wide' && extraType !== 'noBall') {
    //                 bowlerStats.balls = 1;
    //             }
    //             await scorecard.updatePlayerStats(scorecard.teams[teamKey === 'teamA' ? 'teamB' : 'teamA'].teamId, bowlerId, bowlerStats);

    //             // Update current bowler's stats in sportSpecificDetails
    //             sportSpecificDetailsObj.currentBowler.stats.runs += value;
    //             if (extraType !== 'wide' && extraType !== 'noBall') {
    //                 sportSpecificDetailsObj.currentBowler.stats.balls += 1;
    //             }
    //         } else {
    //             console.error('Current bowler information is missing or incomplete');
    //         }

    //         // Update extras statistics
    //         if (!sportSpecificDetailsObj.extras) {
    //             sportSpecificDetailsObj.extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
    //         }
    //         if (extraType === 'wide') {
    //             sportSpecificDetailsObj.extras.wides += value;

    //             sportSpecificDetailsObj.currentBowler.stats.order.push("Wd");
    //         } else if (extraType === 'noBall') {
    //             sportSpecificDetailsObj.extras.noBalls += value;
    //             sportSpecificDetailsObj.currentBowler.stats.order.push("Nb");
    //         } else if (extraType === 'bye') {
    //             sportSpecificDetailsObj.extras.byes += value;
    //             sportSpecificDetailsObj.currentBowler.stats.order.push("B");
    //         } else if (extraType === 'legBye') {
    //             sportSpecificDetailsObj.extras.legByes += value;
    //             sportSpecificDetailsObj.currentBowler.stats.order.push("Lb");

    //         }

    //         // Handle over completion if applicable
    //         if (extraType !== 'wide' && extraType !== 'noBall') {
    //             const currentOver = sportSpecificDetailsObj.currentOver || 0;
    //             const ballsThisOver = Math.floor((currentOver % 1) * 10); // Get the decimal part as balls bowled in this over
    //             if (ballsThisOver + 1 >= 6) {
    //                 // Over is completed
    //                 sportSpecificDetailsObj.currentOver = Math.floor(currentOver) + 1; // Increment over

    //                 // Update the current bowler
    //                 sportSpecificDetailsObj.currentBowler = null;
    //                 scorecard.matchStatus = "innings_setup";

    //                 // Rotate the striker and non-striker
    //                 const { striker, nonStriker } = sportSpecificDetailsObj;
    //                 sportSpecificDetailsObj.striker = nonStriker;
    //                 sportSpecificDetailsObj.nonStriker = striker;
    //             } else {
    //                 // Increment the ball count in the current over
    //                 sportSpecificDetailsObj.currentOver += 0.1;
    //             }
    //         }
    //     }

    //     // Update the sportSpecificDetails in the scorecard

    //     // Optionally, update match statistics if needed
    //     let extra = ["wide", "noBall"].includes(extraType) ? 1 : 0
    //     const matchStats = {
    //         totalScore: value + extra
    //     };


    //     await scorecard.updateMatchStats(matchStats);


    //     scorecard.sportSpecificDetails = new Map(Object.entries(sportSpecificDetailsObj));

    //     // Save the updated scorecard
    //     await scorecard.save();

    //     // Broadcast the updated scorecard to all connected clients
    //     if (wss.clients) {
    //         wss.clients.forEach(client => {
    //             if (client.readyState === WebSocket.OPEN) {
    //                 client.send(JSON.stringify({ type: 'score_update_request', scorecard }));
    //             }
    //         });
    //     } else {
    //         console.error('WebSocket clients are not defined');
    //     }


    //     return true

    // } catch (error) {
    //     console.error('Error updating score:', error);
    // }
}

async function InningUpdate(req, res) {
    // try {
    //     const update = await ScoreCardModel.findById(req.params.id)
    //     // console.log(req.body)
    //     if (!update) {
    //         return res.json(reply.failure("Match not found"))
    //     }
    //     if (req.body.status === "innings_setup") {
    //         update.matchStatus = req.body.status
    //         await update.save();
    //         return res.json(reply.success())
    //     }
    //     else if (req.body.status === "inningEnd") {
    //         const sportSpecificDetails = Object.fromEntries(update.sportSpecificDetails)
    //         const matchStatistics = Object.fromEntries(update.matchStatistics)
    //         sportSpecificDetails.currentInning = 2;
    //         sportSpecificDetails.currentOver = 0;
    //         sportSpecificDetails.striker = null;
    //         sportSpecificDetails.nonStriker = null;
    //         sportSpecificDetails.currentBowler = null;
    //         update.currentPeriod.periodNumber = 2;
    //         matchStatistics.totalScore = 0;
    //         matchStatistics.wickets = 0;
    //         update.matchStatus = "set_seccond_half"
    //         update.sportSpecificDetails = new Map(Object.entries(sportSpecificDetails));
    //         update.matchStatistics = new Map(Object.entries(matchStatistics));
    //     }
    //     else if (req.body.status === "winner") {
    //         await update.determineWinner();
    //         sportSpecificDetails.currentInning = 2;
    //         update.matchStatus = "completed"
    //         // console.log("here")

    //     }
    //     await update.save();

    //     return res.json(reply.success("Scorecard initialized", update._id));

    // } catch (error) {
    //     return res.json(reply.failure("error updating new inning"))
    // }
}

module.exports = {
    ScoreCard, getScore, handleScore, handlePlayerSelection, ScoreUpdate, InningUpdate
};