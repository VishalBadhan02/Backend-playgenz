const mongoose = require("mongoose")

const NotificationSchema = mongoose.Schema({
    receiverId: String,
    actorId: String,
    type: String,
    entityId: String,
    message: String,
    status: Number,
    data: Object,
}, { timestamps: true })

const NotificationModel = mongoose.model("notifications", NotificationSchema)

module.exports = { NotificationModel }