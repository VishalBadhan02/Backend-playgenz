const { mongoose } = require('mongoose')

const TeamSchema = mongoose.Schema({
    teamName: String,
    user_id: {
        type: String,
        ref: "users"
    },
    email: String,
    phoneNumber: String,
    noOfPlayers: String,
    substitute: String,
    homeGround: String,
    addressOfGround: String,
    pinCode: String,
    logo: String,
    games: {
        type: String,
        enum: ["cricket", "football", "badminton", "volleyball", "tennis", "basketball"],
        required: true
    },
    description: String,
    teamMembers: {
        type: Object,
        ref: "users"
    },
    members: String,
    openPositions: Number,
    joinTeam: Boolean,
    teamVisibility: Boolean,
    memberVisibility: Boolean,
    sessionId: String,
    schedule: Object

}, { timestamps: true })

const TeamModel = mongoose.model("teams", TeamSchema)

module.exports = { TeamModel }  