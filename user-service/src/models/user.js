const { mongoose } = require("mongoose");

const userSchema = mongoose.Schema({
    _id: String,
    firstName: String,
    authId: String,
    lastName: String,
    profilePicture: String,
    userName: String,
    phoneNumber: String,
    email: String,
    address: String,
    password: String,
    userType: String,
    team: {
        type: Object,
        ref: "teams"
    },
    userTeams: Array,
    otherTeams: Array,
    status: String,
    friends: Object,
    friend: Object,
    active: { type: Boolean, default: false },
    lastActiveAt: { type: Date },
}, { timestamps: true })

userSchema.index({ userName: 1 });

const UserModel = mongoose.model("users", userSchema);

module.exports = UserModel;