const mongoose = require("mongoose");
// const { ScheduledMatchModel } = require("./scheduledMatch");
// const { RoundModel } = require("./tournamentRounds");
// const TournamentTeamsModel = require("./tournamentEntry");
// const { TournamentModel } = require("./tournament");
// const { updatePlayerStats, updateTeamStats } = require("../helper/updateUserCareerStats");

const ScoreCardSchema = mongoose.Schema({
    // Match Identification
    matchId: {
        type: String,
        ref: 'scheduled_matches',
        // required: true
    },
    scheduledMatch: Object,
    tournamentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'tournaments',
        default: null
    },
    sportType: {
        type: String,
        required: true,
        enum: ['cricket', 'football', 'basketball', 'volleyball'] // Add more sports
    },
    // Teams Information
    teams: {
        teamA: {
            teamId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'teams',
                required: true
            },
            score: {
                type: Number,
                default: 0
            },
            name: {
                type: String,
                required: true
            },
            players: [{
                playerId: {
                    type: String,
                },
                statistics: {
                    type: Map,
                    of: mongoose.Schema.Types.Mixed,
                    default: new Map()
                },
                userName: {
                    type: String,
                }
            }]
        },
        teamB: {
            teamId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'teams',
                required: true
            },
            score: {
                type: Number,
                default: 0
            },
            name: {
                type: String,
                required: true
            },
            players: [{
                playerId: {
                    type: String,
                },
                statistics: {
                    type: Map,
                    of: mongoose.Schema.Types.Mixed,
                    default: new Map()
                },
                userName: {
                    type: String,
                }
            }]
        }
    },

    // Match Status
    matchStatus: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled', "toss_completed", "innings_setup", "set_seccond_half"],
        default: 'scheduled'
    },

    // Current Period/Inning
    currentPeriod: {
        periodNumber: {
            type: Number,
            default: 1
        },
        periodType: String, // "inning", "half", "quarter" etc.
        startTime: Date,
        endTime: Date
    },

    // Sport Specific Details
    sportSpecificDetails: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: new Map()
    },

    // Match Statistics
    matchStatistics: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: new Map()
    }
}, { timestamps: true });


// Indexes for better query performance
ScoreCardSchema.index({ matchId: 1 });
ScoreCardSchema.index({ 'teams.teamA.teamId': 1 });
ScoreCardSchema.index({ 'teams.teamB.teamId': 1 });

// ScoreCardSchema.methods.updatePlayerStats = async function (teamId, playerId, stats) {
//     try {
//         // Determine which team the player belongs to
//         const team = this.teams[teamId.equals(this.teams.teamA.teamId) ? 'teamA' : 'teamB'];
//         // Find the player in the team's player list
//         const player = team.players.find(p => p.playerId.equals(playerId));

//         if (this.tournamentId) {
//             await updatePlayerStats(playerId, stats, this.sportType)
//         }


//         if (!player) {
//             throw new Error('Player not found in the team');
//         }

//         // Find the tournament if this scorecard is running for the tournament scorecard
//         if (this.tournamentId) {
//             const tournamentStats = await TournamentModel.findById(this.tournamentId)
//                 .select("playersParticipations teamsParticipations");

//             if (!tournamentStats) {
//                 throw new Error('Tournament not found');
//             }

//             // Find the specific player in the tournament to update
//             const tournamentPlayer = tournamentStats.playersParticipations.find(
//                 p => p.playerId.toString() === playerId.toString()
//             );

//             if (!tournamentPlayer) {
//                 throw new Error('Player not found in tournament participants');
//             }

//             // Initialize tournament stats if they don't exist
//             if (!tournamentPlayer.tournamentStats) {
//                 tournamentPlayer.tournamentStats = {
//                     sportSpecificStats: {}
//                 };
//             }

//             // Update player statistics
//             for (const [stat, value] of Object.entries(stats)) {
//                 if (stat === "order" || stat === "orderConceded") {
//                     let orderArray = player.statistics.get(stat);

//                     if (!Array.isArray(orderArray)) {
//                         orderArray = [];
//                     }

//                     orderArray.push(value);
//                     player.statistics.set(stat, orderArray);

//                     // Explicitly mark field as modified
//                     player.markModified("statistics");
//                 }
//                 else if (typeof value === 'number') {
//                     // Update match statistics
//                     const currentValue = player.statistics.get(stat) || 0;
//                     player.statistics.set(stat, currentValue + value);

//                     // Update tournament statistics
//                     if (!tournamentPlayer.tournamentStats.sportSpecificStats[stat]) {
//                         tournamentPlayer.tournamentStats.sportSpecificStats[stat] = value;
//                     } else {
//                         tournamentPlayer.tournamentStats.sportSpecificStats[stat] += value;
//                     }

//                     // Track previous milestone
//                     let previousMilestone = player.statistics.get("lastMilestone") || 0;
//                     let newTotalRuns = currentValue + value;

//                     if (newTotalRuns >= 50 && previousMilestone < 50) {
//                         const currentFifties = player.statistics.get("fifties") || 0;
//                         player.statistics.set("fifties", currentFifties + 1);
//                         player.statistics.set("lastMilestone", 50);
//                     }
//                     if (newTotalRuns >= 100 && previousMilestone < 100) {
//                         const currentHundreds = player.statistics.get("hundreds") || 0;
//                         player.statistics.set("hundreds", currentHundreds + 1);
//                         player.statistics.set("lastMilestone", 100);
//                     }

//                     // Mark tournament stats for fifties and hundreds
//                     if (newTotalRuns >= 50 && previousMilestone < 50) {
//                         tournamentPlayer.tournamentStats.sportSpecificStats.fifties =
//                             (tournamentPlayer.tournamentStats.sportSpecificStats.fifties || 0) + 1;
//                     }
//                     if (newTotalRuns >= 100 && previousMilestone < 100) {
//                         tournamentPlayer.tournamentStats.sportSpecificStats.hundreds =
//                             (tournamentPlayer.tournamentStats.sportSpecificStats.hundreds || 0) + 1;
//                     }
//                     // Handle special cases for sixes and fours
//                     if (value === 6 && stats.type != "bowler") {
//                         const currentSixes = player.statistics.get("sixes") || 0;
//                         player.statistics.set("sixes", currentSixes + 1);
//                         tournamentPlayer.tournamentStats.sportSpecificStats.sixes =
//                             (tournamentPlayer.tournamentStats.sportSpecificStats.sixes || 0) + 1;
//                     }
//                     else if (value === 4 && stats.type != "bowler") {
//                         const currentFours = player.statistics.get("fours") || 0;
//                         player.statistics.set("fours", currentFours + 1);
//                         tournamentPlayer.tournamentStats.sportSpecificStats.fours =
//                             (tournamentPlayer.tournamentStats.sportSpecificStats.fours || 0) + 1;
//                     }
//                 } else {
//                     // Handle non-numeric stats
//                     player.statistics.set(stat, value);
//                     tournamentPlayer.tournamentStats.sportSpecificStats[stat] = value;
//                 }
//             }

//             // Mark the array as modified to ensure mongoose detects the changes
//             tournamentStats.markModified('playersParticipations');

//             // Save both documents
//             await Promise.all([
//                 this.save(),
//                 tournamentStats.save()
//             ]);

//             // console.log("Statistics updated successfully");
//         } else {
//             // If not a tournament match, just save the scorecard
//             await this.save();
//         }

//     } catch (error) {
//         console.error("Error updating player stats:", error);
//         throw error;
//     }
// };

// Method to update match statistics

// ScoreCardSchema.methods.updateMatchStats = async function (stats) {
//     const inning = this.currentPeriod.periodNumber === 1 ? "firstInnings" : "secondInnings";
//     const sportSpecificDetails = Object.fromEntries(this.sportSpecificDetails);
//     for (const [stat, value] of Object.entries(stats)) {
//         // Update matchStatistics
//         const currentValue = this.matchStatistics.get(stat) || 0;
//         this.matchStatistics.set(stat, currentValue + value);

//         // Ensure sportSpecificDetails[inning] exists and is an object
//         if (!sportSpecificDetails[inning]) {
//             sportSpecificDetails[inning] = { extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 } };
//         }

//         if (stat === 'extras') {
//             const extraType = value;
//             if (!sportSpecificDetails[inning].extras) {
//                 sportSpecificDetails[inning].extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
//             }
//             sportSpecificDetails[inning].extras[extraType] = (sportSpecificDetails[inning].extras[extraType] || 0) + 1;
//         } else {
//             sportSpecificDetails[inning][stat] = (sportSpecificDetails[inning][stat] || 0) + value;
//             sportSpecificDetails[inning]["balls"] = (sportSpecificDetails[inning]["balls"] || 0) + 1;
//         }
//     }

//     await this.save();
// };


// ScoreCardSchema.methods.determineWinner = async function () {
//     const firstInnings = this.sportSpecificDetails.get('firstInnings');
//     const secondInnings = this.sportSpecificDetails.get('secondInnings');
//     // Ensure both innings data exists
//     if (!firstInnings || !secondInnings) {
//         throw new Error('Incomplete innings data to determine winner');
//     }

//     const teamAScore = firstInnings.battingTeam == this.teams.teamA.teamId ? firstInnings.totalScore : secondInnings.totalScore;
//     const teamBScore = secondInnings.battingTeam == this.teams.teamA.teamId ? firstInnings.totalScore : secondInnings.totalScore;

//     const scheduledMatch = await ScheduledMatchModel.findById(this.matchId);

//     if (teamAScore > teamBScore) {

//         this.sportSpecificDetails.set('winner', this.teams.teamA.teamId);
//         this.sportSpecificDetails.set('winningWay', {
//             points: teamAScore - teamBScore, type: "Runs"
//         });

//         scheduledMatch.results = scheduledMatch.results || {};
//         scheduledMatch.results.userTeams = (scheduledMatch.results.userTeams || 0) + 1;

//         await ScheduledMatchModel.findOneAndUpdate({ _id: this.matchId }, {
//             $set: {
//                 status: 2,
//                 reMatch: 2
//             }, $inc: {
//                 "results.userTeams": 1
//             }
//         });

//         if (this.tournamentId) {
//             await RoundModel.findOneAndUpdate(
//                 { tournamentId: this.tournamentId, roundNumber: scheduledMatch.roundNumber },
//                 {
//                     $push: {
//                         winners: this.teams.teamA.teamId,
//                         looser: this.teams.teamB.teamId,
//                     }
//                 }
//             );
//             await TournamentTeamsModel.findOneAndUpdate({ teamID: this.teams.teamA.teamId }, {
//                 $set: {
//                     matchStatus: "promoted"
//                 }
//             })
//             await TournamentTeamsModel.findOneAndUpdate({ teamID: this.teams.teamB.teamId }, {
//                 $set: {
//                     matchStatus: "eleminated"
//                 }
//             })
//             await updateTeamStats(this.teams.teamA.teamId, this.teams.teamB.teamId, this.sportType)
//         }
//     } else if (teamAScore < teamBScore) {
//         this.sportSpecificDetails.set('winner', this.teams.teamB.teamId);
//         this.sportSpecificDetails.set('winningWay', {
//             points: this.sportSpecificDetails.get("players") - secondInnings.wickets, type: "Wickets"
//         });

//         scheduledMatch.results = scheduledMatch.results || {};
//         scheduledMatch.results.opponentTeams = (scheduledMatch.results.opponentTeams || 0) + 1;

//         await ScheduledMatchModel.findOneAndUpdate({ _id: this.matchId }, {
//             $set: {
//                 status: 2,
//                 // results: scheduledMatch.results,
//                 reMatch: 2
//             }, $inc: {
//                 "results.opponentTeams": 1
//             }
//         });

//         if (this.tournamentId) {
//             await RoundModel.findOneAndUpdate(
//                 { tournamentId: this.tournamentId, roundNumber: scheduledMatch.roundNumber },
//                 {
//                     $push: {
//                         winners: this.teams.teamB.teamId,
//                         looser: this.teams.teamA.teamId,
//                     }
//                 }
//             );
//             await TournamentTeamsModel.findOneAndUpdate({ teamID: this.teams.teamB.teamId }, {
//                 $set: {
//                     matchStatus: "promoted"
//                 }
//             })
//             await TournamentTeamsModel.findOneAndUpdate({ teamID: this.teams.teamA.teamId }, {
//                 $set: {
//                     matchStatus: "eleminated"
//                 }
//             })
//             await updateTeamStats(this.teams.teamB.teamId, this.teams.teamA.teamId, this.sportType)

//         }
//     } else {
//         this.sportSpecificDetails.set('winner', 'draw');
//         this.sportSpecificDetails.set('winnerName', 'Draw');
//         this.matchStatus === "completed"

//         await ScheduledMatchModel.findOneAndUpdate({ _id: this.matchId }, {
//             $set: {
//                 status: 2,
//                 results: {
//                     winner: 'draw',
//                     reMatch: 2
//                 }
//             }
//         });
//         if (this.tournamentId) {
//             await RoundModel.findOneAndUpdate({ tournamentId: this.tournamentId, roundNumber: scheduledMatch.roundNumber }, {
//                 $push: {
//                     winners: {
//                         teamId: 'draw',
//                         score: teamAScore
//                     }
//                 }
//             });
//         }
//     }
//     console.log("here")

//     this.matchStatus = 'completed';
//     await this.save();
// };

const ScoreCardModel = mongoose.model("scorecards", ScoreCardSchema);

module.exports = { ScoreCardModel };

