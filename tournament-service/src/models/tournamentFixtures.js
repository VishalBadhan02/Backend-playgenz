const mongoose = require('mongoose');

// Enum for tournament types
const TOURNAMENT_TYPES = {
    SINGLE_ELIMINATION: 'single_elimination',
    DOUBLE_ELIMINATION: 'double_elimination',
    ROUND_ROBIN: 'round_robin',
    SWISS_SYSTEM: 'swiss_system',
    GROUP_STAGE: 'group_stage'
};

// Enum for match status
const MATCH_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

// Team Schema (Sub-document)
const TeamSchema = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    seed: {
        type: Number,
        min: 1
    },
    bye: {
        type: Boolean,
        default: false
    }
}, { _id: false });


// Match Schema (Sub-document)
const MatchSchema = new mongoose.Schema({
    matchId: {
        type: String,
        required: true,
        unique: true
    },
    roundNumber: {
        type: Number,
        required: true,
        min: 1
    },
    matchNumber: {
        type: Number,
        required: true,
        min: 1
    },
    teamA: TeamSchema,
    teamB: TeamSchema,
    winner: TeamSchema,
    loser: TeamSchema,
    nextMatchId: String, // ID of the next match for the winner
    loserNextMatchId: String, // For double elimination
    scheduled: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: Object.values(MATCH_STATUS),
        default: MATCH_STATUS.PENDING
    },
    score: {
        teamA: Number,
        teamB: Number
    },
    venue: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Venue'
    }
}, { timestamps: true });


// Round Schema (Sub-document)
const RoundSchema = new mongoose.Schema({
    roundNumber: {
        type: Number,
        required: true,
        min: 1
    },
    name: {
        type: String,
        trim: true
    },
    matches: [MatchSchema],
    status: {
        type: String,
        enum: Object.values(MATCH_STATUS),
        default: MATCH_STATUS.PENDING
    },
    startDate: Date,
    endDate: Date
}, { timestamps: true });

// Main Tournament Fixtures Schema
const TournamentFixtureSchema = new mongoose.Schema({
    tournament_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tournament',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: Object.values(TOURNAMENT_TYPES),
        required: true,
        index: true
    },
    metadata: {
        totalTeams: {
            type: Number,
            required: true,
            min: 2
        },
        totalRounds: {
            type: Number,
            required: true,
            min: 1
        },
        currentRound: {
            type: Number,
            default: 1
        },
        seeded: {
            type: Boolean,
            default: false
        },
        withByes: {
            type: Boolean,
            default: true
        },
        status: {
            type: String,
            enum: Object.values(MATCH_STATUS),
            default: MATCH_STATUS.PENDING
        },
        winner: TeamSchema,
        runnerUp: TeamSchema,
        created_by: {
            type: String,
            required: true,
            default: 'VishalBadhan02'
        },
        created_at: {
            type: Date,
            default: () => new Date("2025-02-01 15:57:27")
        }
    },
    rounds: [RoundSchema],
    // For double elimination
    winnersRounds: [RoundSchema],
    losersRounds: [RoundSchema],
    finalRound: RoundSchema,
    // For group stage
    groups: [{
        name: String,
        teams: [TeamSchema],
        standings: [{
            team: TeamSchema,
            played: Number,
            won: Number,
            lost: Number,
            drawn: Number,
            points: Number
        }],
        rounds: [RoundSchema]
    }]
}, {
    timestamps: true,
    collection: 'tournament_fixtures'
});

// Indexes
TournamentFixtureSchema.index({ 'tournament_id': 1, 'type': 1 });
TournamentFixtureSchema.index({ 'metadata.status': 1 });
TournamentFixtureSchema.index({ 'rounds.matches.status': 1 });
TournamentFixtureSchema.index({ createdAt: -1 });

// Virtual for progress percentage
TournamentFixtureSchema.virtual('progress').get(function () {
    const totalMatches = this.rounds.reduce((sum, round) => sum + round.matches.length, 0);
    const completedMatches = this.rounds.reduce((sum, round) => {
        return sum + round.matches.filter(match => match.status === MATCH_STATUS.COMPLETED).length;
    }, 0);

    return Math.round((completedMatches / totalMatches) * 100);
});

// Methods
TournamentFixtureSchema.methods.getCurrentRound = function () {
    return this.rounds.find(round => round.status === MATCH_STATUS.IN_PROGRESS);
};

TournamentFixtureSchema.methods.getMatchById = function (matchId) {
    for (const round of this.rounds) {
        const match = round.matches.find(m => m.matchId === matchId);
        if (match) return match;
    }
    return null;
};

TournamentFixtureSchema.methods.updateMatchResult = async function (matchId, winner, score) {
    const match = this.getMatchById(matchId);
    if (!match) throw new Error('Match not found');

    match.winner = winner;
    match.score = score;
    match.status = MATCH_STATUS.COMPLETED;

    // Update next match if exists
    if (match.nextMatchId) {
        const nextMatch = this.getMatchById(match.nextMatchId);
        if (nextMatch) {
            if (!nextMatch.teamA) {
                nextMatch.teamA = winner;
            } else {
                nextMatch.teamB = winner;
            }
        }
    }

    await this.save();
    return match;
};

// Model
const TournamentFixturesModel = mongoose.model('TournamentFixture', TournamentFixtureSchema);

// Export
module.exports = {
    TournamentFixturesModel,
    TOURNAMENT_TYPES,
    MATCH_STATUS
};




