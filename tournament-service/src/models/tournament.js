const mongoose = require("mongoose")

const TermsAndConditionsSchema = new mongoose.Schema({
    general_rules: [String], // General rules applicable to all sports
    violations: [String], // Common fouls, penalties, and disqualification rules
    eligibility: {
        age_limit: String, // Age restrictions
        gender: String, // Gender-based restrictions
        proof_required: [String] // Proof documents (ID, license, etc.)
    },
    equipment_rules: {
        standard_equipment: Boolean, // Whether standard equipment is mandatory
        custom_equipment_allowed: Boolean, // If players can bring custom gear
        equipment_list: [String] // Specific equipment required
    },
    match_rules: {
        duration: String, // Match duration
        timeouts: Number, // Allowed timeouts per team
        substitutions: Number, // Max number of player substitutions
        special_conditions: [String] // Any special rules based on sport
    },
    fair_play: {
        code_of_conduct: [String], // Behavior expectations
        penalties: [String], // Types of penalties (Yellow card, Red card, Technical foul, etc.)
        disqualification_criteria: [String] // Actions leading to disqualification
    },
    appeal_process: {
        allowed: Boolean, // Can teams appeal decisions?
        appeal_duration: String, // How long do they have to appeal?
        appeal_fee: Number // If applicable
    }
});

const TournamnetSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    poster: String,
    img: Array,
    rank: String,
    sport: {
        type: String,
        required: true
    },
    tournamentMode: {
        type: String,
        enum: ["online", "offline"],
        required: true
    },
    tournamentEnvironment: {
        type: String,
        enum: ["private", "public"],
        required: true
    },
    gameType: {
        type: String,
        enum: ["online", "outdoor"],
        default: "outdoor"
    },
    fixtureType: {
        type: String,
        enum: ["single_elimination", "double_elimination", "round_robin", "swiss_system", "group_stage", "soloFixtures", "duoFixtures", "squadFixtures", "customModeFixtures", "killRaceFixtures", "timeLimitedFixtures", "leagueFixtures", "charityFixtures", "streamerInvitationalFixtures", "mixedModeFixtures"],
        required: true,
        default: "single_elimination"
    },
    headAdmin: {
        type: String,
        required: true
    },
    admin: {
        type: Array,
        ref: "users"
    },
    contact: {
        type: String,
        required: true
    },
    alternativeContact: {
        type: String,
        required: true
    },
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date,
        required: true
    },
    totalTeams: {
        type: Number,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    entryFee: {
        type: Number,
        required: true
    },
    playingPeriod: {
        type: String,
        required: true
    },
    teamId: Boolean,
    prizes: {
        firstPrice: {
            type: Number,
            required: true
        },
        secondPrice: {
            type: Number,
            required: true
        },
        thirdPrice: {
            type: Number,
            required: true
        },
    },
    timings: String,
    tournamentDescription: {
        ageLimit: String,
        gender: String,
        proof: String,
        players: {
            playing: Number,
            extra: Number
        }
    },
    facilities: {
        waterTank: Boolean,
        lightning: Boolean,
        commentators: Boolean,
        duck: Boolean,
        jursey: Boolean,
        resourses: {
            avalability: Boolean,
            types_of_equpements: Array
        }
    },
    gameDescription: {
        specialPlay: Number,
        playUnit: String,
        penaltyCode: Array
    },
    terms_and_conditions: TermsAndConditionsSchema,
    status: String,
    winner: {
        type: String,
        default: null
    },
    isVerified: {
        type: Boolean,
        required: true,
        default: false
    },
    matches: Number,
    playersParticipations: Array,
    teamsParticipations: Array
}, { timestamps: true })

const TournamentModel = mongoose.model("tournaments", TournamnetSchema)

module.exports = { TournamentModel }






