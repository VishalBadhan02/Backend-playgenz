const { mongoose } = require("mongoose")

const TournamentTeamsSchema = mongoose.Schema({
    tournametId: {
        type: String,
        ref: "tournaments",
        required: true
    },
    teamID: {
        type: String,
        required: true
    },
    userId: {
        type: String,
    },
    status: {
        type: Number,
        default: 0,// You can define the status codes as per your requirements
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "completed", "rejected", "failed"],
        default: "pending",
        required: true
    },
    matchStatus: {
        type: String,
        enum: ["promoted", "disqualified", "eleminated", "winner", "re-entry", "registered", "rejected"]
    },
    matchesPlayed: {
        type: Number,
        default: 0
    },
    matchesWon: {
        type: Number,
        default: 0
    },
    matchesLost: {
        type: Number,
        default: 0
    },
    matchesDrawn: {
        type: Number,
        default: 0
    },
    points: {
        type: Number,
        default: 0
    },
    seed: {
        type: Number,      // Seeding is used to rank teams based on their performance or skill     level. This ranking helps in organizing the tournament matches, ensuring that the highest-ranked teams do not face each other in the initial rounds
        min: 1
    },
    bye: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

TournamentTeamsSchema.index({ tournametId: 1, points: -1 });


const TournamentTeamsModel = mongoose.model("tournamentteams", TournamentTeamsSchema)

module.exports = TournamentTeamsModel;