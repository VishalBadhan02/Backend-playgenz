const mongoose = require("mongoose")

const FriendsSchema = mongoose.Schema({
    user_id: {
        type: String,
        ref: "users"
    },
    request: {
        type: String,
        ref: "users"
    },
    status: Number,
    commit: String,
    type: String,
    session_id: String,
    pendingMessage: Object
}, { timestamps: true })

const FriendModel = mongoose.model("friends", FriendsSchema)

module.exports = { FriendModel }