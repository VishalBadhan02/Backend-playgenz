const mongoose = require('mongoose');

const ScheduleSchema = mongoose.Schema({
    /** Type of match being played */
    matchType: {
        type: String,
        enum: ["friendly", "tournament"],
        required: true
    },

    /** Only required for tournament matches */
    tournamentId: {
        type: String,
        ref: "tournaments",
        required: function () {
            return this.matchType === "tournament";
        }
    },

    /** unique match id */
    matchId: {
        type: String,
        required: true,
        unique: true
    },

    /** Round number within the tournament */
    tournamentRound: {
        type: Number,
        required: function () {
            return this.matchType === "tournament";
        }
    },

    /** ID of the user's team */
    homeTeam: {
        type: String,
        ref: "teams"
    },

    /** User who created or scheduled the match */
    scheduledByUserId: {
        type: String,
        ref: "users"
    },

    /** ID of the opponent team */
    awayTeam: {
        type: String,
        ref: "teams"
    },

    /** ID of the opponent user (if friendly match with individual) */
    opponentUserId: {
        type: String,
        ref: "users"
    },

    /** Date of the match in YYYY-MM-DD format */
    matchDate: {
        type: String,
        required: true
    },

    /** Total number of matches (for series or rematches) */
    numberOfMatches: {
        type: Number
    },

    /** General location (city, area, etc.) */
    matchLocation: {
        type: String
    },

    /** Specific ground name */
    groundName: {
        type: String
    },

    /** Number of overs (only relevant to cricket) */
    numberOfOvers: {
        type: String,
        required: true
    },

    /** Number of players in each team */
    numberOfPlayers: {
        type: Number,
        required: true
    },

    /** Internal status code (e.g. 0 = inactive, 1 = active) */
    internalStatus: {
        type: Number,
        required: true
    },

    /** Public match status */
    matchStatus: {
        type: String,
        enum: ["upcoming", "completed", "cancelled", "abandoned", "pending"],
        required: true
    },

    /** Rematch number (used if match is rescheduled) */
    rematchCount: {
        type: Number
    },

    /** Session ID (used for booking/availability tracking) */
    sessionId: {
        type: String
    },

    /** Type of sport */
    sportType: {
        type: String,
        enum: ['cricket', 'football', 'basketball', 'volleyball'],
        required: true
    },

    /** Results of the match (can contain scores, winner info etc.) */
    matchResult: {
        type: Object,
        ref: "teams"
    }

}, { timestamps: true });

const ScheduledMatchModel = mongoose.model("scheduled_matches", ScheduleSchema);

module.exports = { ScheduledMatchModel };
