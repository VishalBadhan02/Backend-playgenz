// utils/notifications.js

const Config = require("../config");

const createNotificationPayload = ({ receiverId, actorId, entityId, actionType }) => {
    let message;

    switch (actionType) {
        case "removed":
            message = `You have been removed from the team`;
            break;

        case "leave":
            message = `You have left the team`;
            break;

        case "Coach":
            message = `You have been promoted to Coach in`;
            break;

        case "Captain":
            message = `You have been promoted to Captain in`;
            break;

        case "Player":
            message = `Your role has been changed to Player in`;
            break;

        case "Manager":
            message = `You have been assigned as Manager of`;
            break;

        default:
            message = `There was an update in the team`;
    }

    return {
        receiverId,
        actorId,
        type: Config.NOTIF_TYPE_REQUEST,
        entityId,
        message,
        status: 1,
        data: {
            type: "message",
            role: actionType,
        },
    };
};

module.exports = { createNotificationPayload };
