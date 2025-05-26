

const mongoose = require("mongoose")

const MessageSchema = mongoose.Schema({
    from: { type: String, ref: "users", required: true },    // Sender's ID
    to: { type: String, ref: 'users', required: true },      // Receiver's ID
    teamId: { type: String, ref: 'teams' },
    message: { type: String, required: true },
    userName: String,
    conversationId: String,
    messageType: { type: String, enum: ['direct', 'team'] }, // Message content
    sessionId: String,
    status: Number
}, { timestamps: true })

const MessageModel = mongoose.model("messages", MessageSchema)


module.exports = { MessageModel }