const mongoose = require("mongoose")

const AddTeamMemberSchema = mongoose.Schema({
    userId: {
        type: String,
        ref: "users"
    },
    playerId: {
        type: String,
        ref: "users"
    },
    userName: String,
    status: {
        type: Number,
        enum: [0, 1, 2], // Define what each number means
        default: 0
    },
    commit: String,
    teamId: {
        type: String,
        ref: "teams",
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    playingStatus: Boolean,
    extra: Boolean,
    careerStats: {
        matchesPlayed: {
            type: Number,
            default: 0
        },
        sportSpecificStats: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: new Map()
        }
    },
    tournamentStats: {
        sportSpecificStats: {
            type: Object,
            default: {}
        }
    },
    sportType: {
        type: String,
        enum: ['cricket', 'football', 'basketball', 'volleyball'] // Add more sports
    }
}, { timestamps: true })

AddTeamMemberSchema.index({ teamId: 1, playerId: 1 }); // Compound index for better search performance
AddTeamMemberSchema.index({ userId: 1 });

const AddTeamMemberModel = mongoose.model("team_members", AddTeamMemberSchema)

module.exports = { AddTeamMemberModel }