const reply = require('../helper/reply');
const { TournamentModel } = require('../models/tournament');
const { RoundModel } = require('../models/tournamentRounds');
const { v4: uuidv4 } = require('uuid');
const tournamentServices = require('../services/tournamentServices');
const sendMessage = require('../kafka/producer');
const { ScheduleMatchResponse } = require('../services/grpcServices');
const { storeFixtureRound, storeFixtures } = require('../services/redisService');

class TournamentController {
    constructor(tournamentId, type, round, teams, res, withByes, randomize, dateOfMatch, save) {
        if (!tournamentId || !type || !round || !teams || !res || !dateOfMatch) {
            return res.json(reply.failure("Missing required parameters"));
        }
        this.tournamentId = tournamentId;
        this.type = type;
        this.round = round;
        this.teams = teams;
        this.res = res;
        this.withByes = withByes;
        this.randomize = randomize;
        this.dateOfMatch = dateOfMatch || new Date();
        this.save = save;
        this.cacheKey = `fixtureKey:${this.tournamentId}`;
    }

    async _generateFixtures() {
        const valid = await this.validateTournament(this.type, this.tournamentId);
        if (!valid) {
            return this.res.status(400).json(reply.failure("Invalid tournament type"));
        }

        const tournamentGenerators = {
            "single_elimination": this._generateSingleElimination,
            "round_robin": this._generateRoundRobin,
            "double_elimination": this._generateKnockout,
            "swiss_system": this._generateSwissSystem,
            "group_stage": this._generateGroupStage,
            "announceWinner": this.determineWinners
        };

        const generator = tournamentGenerators[this.type];
        if (generator) {
            return generator.call(this);
        } else {
            return this.res.status(400).json(reply.failure("Invalid tournament type"));
        }
    }

    async validateTournament(type, _id) {
        if (["single_elimination", "round_robin", "double_elimination", "swiss_system", "group_stage"].includes(type)) {
            return true;
        }
        try {
            const tournament = await TournamentModel.findOne({ _id, type });
            return !!tournament;
        } catch (error) {
            this.res.status(500).json(reply.failure("Internal server error"));
            return false;
        }
    }

    async _generateSingleElimination() {
        try {
            // Step 1: Shuffle teams if required
            if (this.randomize) {
                await new Promise(resolve => setTimeout(resolve, 0));
                this.teams = this._shuffleTeams(this.teams);
            }
            let totalTeams = this.teams.length;
            let fixtures = [];
            let currentRoundTeams = [...this.teams];
            let generatedByes = [];
            let fixturesCount = currentRoundTeams.length;
            let lastMatch = [];

            // Step 2: If withBye is enabled, calculate necessary byes
            if (this.withByes) {
                let nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
                let byesNeeded = nextPowerOfTwo - totalTeams;
                // Assign byes to the first N teams (automatically advance)
                let byeTeams = currentRoundTeams.splice(0, byesNeeded);
                fixtures.push(...byeTeams.map(team => (
                    team.id
                )));
                generatedByes = fixtures;
                fixturesCount -= byesNeeded;
            }

            let roundFixtures = [];
            let ScheduledMatches = [];

            for (let i = 0; i < fixturesCount - 1; i += 2) {
                const match = {
                    round: this.round,
                    id: uuidv4(),
                    team1: currentRoundTeams[i],
                    team2: currentRoundTeams[i + 1] || null, // Handle odd teams
                    status: "upcoming",
                    dateTime: 'June 15, 2025 - 2:00 PM',
                    venue: 'Main Stadium',
                };

                // if (this.save) {
                const matchId = await this.saveScheduleMatch(match);
                ScheduledMatches.push(matchId);
                // match.id = matchId;
                // }// Ensure this is awaited
                roundFixtures.push(match);
            }

            // console.log("roundFixtures", kafka)
            // Handle the last team if the number of teams is odd
            if (fixturesCount % 2 !== 0) {
                const Match = {
                    round: this.round,
                    team1: currentRoundTeams[fixturesCount - 1],
                    team2: null,
                    status: "bye"
                };
                lastMatch.push(Match);
                generatedByes.push(currentRoundTeams[fixturesCount - 1].id)
            }

            // console.log("ScheduledMatches", ScheduledMatches)

            await storeFixtures(this.tournamentId, ScheduledMatches);


            fixtures.push(...roundFixtures);


            const saved = await this.saveRoundFixtures(roundFixtures, generatedByes);

            if (!saved.success) {
                console.log("error getting the formated data of saveRoundFixtures", saved)
                return this.res.status(500).json(reply.failure("Internal server error"));
            }

            // console.log("saved", fixtures)
            return this.res.status(200).json(reply.success("Fixtures generated successfully", { fixtures: roundFixtures, lastMatch }));

        } catch (error) {
            console.error("Error generating fixtures:", error);
            if (!this.res.headersSent) {
                return this.res.status(500).json(reply.failure("Internal server error"));
            }
        }
    }

    async _generateRoundRobin() {
        try {
            // Shuffle teams if randomization is enabled
            if (this.randomize) {
                this.teams = this._shuffleTeams(this.teams);
            }

            const fixtures = [];
            const totalTeams = this.teams.length;

            // Generate fixtures for each team to play every other team
            for (let i = 0; i < totalTeams - 1; i++) {
                for (let j = i + 1; j < totalTeams; j++) {
                    const match = {
                        round: this.round,
                        team1: this.teams[i],
                        team2: this.teams[j],
                        status: "pending"
                    };
                    fixtures.push(match);

                    // Save the match if required
                    if (this.save) {
                        await this.saveScheduleMatch(match);
                    }
                }
            }

            // Save the round fixtures if required
            if (this.save) {
                await this.saveRoundFixtures(fixtures, []);
            }

            return this.res.status(200).json(reply.success("Round Robin fixtures generated successfully", { fixtures }));
        } catch (error) {
            console.error("Error generating Round Robin fixtures:", error);
            if (!this.res.headersSent) {
                return this.res.status(500).json(reply.failure("Internal server error"));
            }
        }
    }

    async _generateKnockout() {
        try {
            // Shuffle teams if randomization is enabled
            if (this.randomize) {
                this.teams = this._shuffleTeams(this.teams);
            }

            const fixtures = [];
            const totalTeams = this.teams.length;
            let currentRoundTeams = [...this.teams];

            // Generate initial round fixtures
            for (let i = 0; i < totalTeams - 1; i += 2) {
                const match = {
                    round: this.round,
                    team1: currentRoundTeams[i],
                    team2: currentRoundTeams[i + 1] || null,
                    status: "pending"
                };
                fixtures.push(match);
                // Save the match if required
                if (this.save) {
                    await this.saveScheduleMatch(match);
                }
            }

            // Save the round fixtures if required
            if (this.save) {
                await this.saveRoundFixtures(fixtures, []);
            }

            return this.res.status(200).json(reply.success("Double Elimination fixtures generated successfully", { fixtures }));
        } catch (error) {
            console.error("Error generating Double Elimination fixtures:", error);
            if (!this.res.headersSent) {
                return this.res.status(500).json(reply.failure("Internal server error"));
            }
        }
    }

    async _generateSwissSystem() {
        try {
            // Shuffle teams if randomization is enabled
            if (this.randomize) {
                this.teams = this._shuffleTeams(this.teams);
            }

            const fixtures = [];
            const totalTeams = this.teams.length;

            // Pair teams for the first round
            for (let i = 0; i < totalTeams - 1; i += 2) {
                const match = {
                    round: this.round,
                    team1: this.teams[i],
                    team2: this.teams[i + 1] || null,
                    status: "pending"
                };
                fixtures.push(match);

                // Save the match if required
                if (this.save) {
                    await this.saveScheduleMatch(match);
                }
            }

            // Save the round fixtures if required
            if (this.save) {
                await this.saveRoundFixtures(fixtures, []);
            }

            return this.res.status(200).json(reply.success("Swiss System fixtures generated successfully", { fixtures }));
        } catch (error) {
            console.error("Error generating Swiss System fixtures:", error);
            if (!this.res.headersSent) {
                return this.res.status(500).json(reply.failure("Internal server error"));
            }
        }
    }

    async _generateGroupStage() {
        try {
            // Shuffle teams if randomization is enabled
            if (this.randomize) {
                this.teams = this._shuffleTeams(this.teams);
            }

            const totalTeams = this.teams.length;
            const groupSize = 4; // Default group size (can be parameterized)
            const groups = [];
            const fixtures = [];

            // Divide teams into groups
            for (let i = 0; i < totalTeams; i += groupSize) {
                const group = this.teams.slice(i, i + groupSize);
                groups.push(group);
            }

            // Generate fixtures for each group
            for (const group of groups) {
                for (let i = 0; i < group.length - 1; i++) {
                    for (let j = i + 1; j < group.length; j++) {
                        const match = {
                            round: this.round,
                            team1: group[i],
                            team2: group[j],
                            status: "pending"
                        };
                        fixtures.push(match);

                        // Save the match if required
                        if (this.save) {
                            await this.saveScheduleMatch(match);
                        }
                    }
                }
            }

            // Save the round fixtures if required
            if (this.save) {
                await this.saveRoundFixtures(fixtures, []);
            }

            return this.res.status(200).json(reply.success("Group Stage fixtures generated successfully", { fixtures, groups }));
        } catch (error) {
            console.error("Error generating Group Stage fixtures:", error);
            if (!this.res.headersSent) {
                return this.res.status(500).json(reply.failure("Internal server error"));
            }
        }
    }

    _shuffleTeams(teams) {
        for (let i = teams.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [teams[i], teams[j]] = [teams[j], teams[i]];
        }
        return teams;
    }

    async _getWinnersFromMatches(matches) {
        return matches.map(match => match.winner);
    }

    async saveScheduleMatch(match) {
        try {
            const tournament = await tournamentServices.findTournament(this.tournamentId);

            if (!tournament) {
                return this.res.status(404).json(reply.failure("Tournament not found"));
            }

            if (match.team1 == null || match.team2 == null) {
                return
            }

            const scheduledMatch = {
                matchId: match.id,
                matchType: "tournament",
                tournamentId: this.tournamentId,
                tournamentRound: this.round,

                homeTeam: match.team1.id || null,
                scheduledByUserId: match.team1.userID || null,

                awayTeam: match.team2.id || null,
                opponentUserId: match.team2.userID || null,

                matchDate: match.dateTime || this.dateOfMatch,
                numberOfMatches: 1,

                matchLocation: tournament.venue || null,
                groundName: tournament.venue || null,

                numberOfOvers: tournament?.playingPeriod?.toString() || "0", // schema expects String
                numberOfPlayers: tournament.players || 6,

                internalStatus: 0,
                matchStatus: match.status, // e.g. "upcoming"

                rematchCount: 0, // optional, defaulting to 0
                sessionId: null, // set if applicable
                sportType: "cricket", // make dynamic if needed

                matchResult: {} // or provide actual result data if available
            };

            console.log("scheduledMatch", scheduledMatch)
            // const scheduledMatch = {
            //     matchId: match.id,
            //     tournamentId: this.tournamentId,
            //     tournamentRound: this.round,
            //     matchType: "tournament",
            //     userTeamId: match.team1.id || null,
            //     userId: match.team1.userID || null,
            //     opponentId: match.team2.id || null,
            //     opponentUserId: match.team2.userID || null,
            //     matchDate: this.dateOfMatch,
            //     totalMatches: 1,
            //     ground: tournament.location,
            //     numberOfOvers: tournament.overs || 0,
            //     numberOfPlayers: tournament.players || 6,
            //     status: 1,
            //     matchStatus: match.status,
            //     sportType: "cricket",
            //     internalStatus: 0
            // };
            // console.log("scheduledMatch", scheduledMatch)
            // await scheduledMatch.save();

            return scheduledMatch
        } catch (error) {
            console.error("Error saving match:", error);
            if (!this.res.headersSent) {
                return this.res.status(500).json(reply.failure("Internal server error"));
            }
        }
    }

    async saveRoundFixtures(fixtures, generatedByes) {
        try {
            const saveRound = {
                tournamentId: this.tournamentId,
                tournamentType: this.type,
                matches: fixtures,
                byes: generatedByes,
                status: "pending",
                roundNumber: this.round
            };
            // console.log(saveRound)
            await storeFixtureRound(this.cacheKey, saveRound);

            return { success: true };  // ✅ Return a success object instead of sending a response
        } catch (error) {
            console.error("Error saving round fixtures:", error);
            return { success: false, error: "Internal server error" };  // ✅ Return error instead of sending response
        }
    }

    async determineWinners() {
        console.log("Announce Winner!")
        // Fetch all winners' team details and update the tournament
        const result = await Promise.all(
            round.winners.map(async (teamID) => {
                // Fetch the team details
                const team = await TournamentModel.findOne({ _id: id });

                if (!team) {
                    return res.json(reply.failure("Unable to find tounrament")); // Handle case where team is not found
                }

                // Update the tournament with the winner
                // console.log(teamID._id)
                if (save) {
                    await TournamentModel.findOneAndUpdate(
                        { _id: id },
                        { $set: { winner: teamID._id } }
                    );
                }

                // Return winner details
                return {
                    id: teamID._id,
                    userID: teamID.user_id,
                    name: teamID.teamName,
                    avatar: teamID.profilePicture
                };
            })
        );
        // console.log(result)

        // Remove null values in case any team was not found
        const filteredResult = result.filter((team) => team !== null);

        // return res.json(reply.success("Tournament Completed!", filteredResult));


        return res.json(reply.success("Tournament Completed!", result))
    }

}





module.exports = TournamentController;  