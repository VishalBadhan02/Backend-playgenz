const reply = require('../helper/reply');
const Lang = require("../language/en");
const notificationService = require('../services/notificationService');
const { deleteNotifications } = require('../services/redisServices');


const handleFriendRequest = async (data) => {
    try {
        //new notification is being created for user 
        const notification = await notificationService.setNotification(data)
        if (!notification) {
            return false
        }
        await deleteNotifications(`user:${data?.receiverId}:notifications`)
        return true
    } catch (error) {
        return error
    }
}

const handleDeleteRequest = async (data) => {
    try {
        if (data?.operation === "delete") {
            // deleting the notification is user undo it within the minuit
            await notificationService.deleteNotification(data?.entityId)
            return true
        }
        // not deleting but canceling the request by making the status 3, which means the request not longer exist
        await notificationService.updateNotification(data?.entityId, 3, Lang.CANCEL_REQUEST)
        return true
    } catch (error) {
        return error
    }
}

const handleApproveRequest = async (data) => {
    try {
        await notificationService.updateNotification(data?.entityId, 1, Lang.APPROVER_SIDE_USER_REQUEST)
        return true
    } catch (error) {

    }
}

module.exports = {
    handleFriendRequest,
    handleDeleteRequest,
    handleApproveRequest
}