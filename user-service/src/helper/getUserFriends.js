const { FriendModel } = require("../models/useFriends");
const userService = require("../services/userService");

const setFriends = async (session) => {
    try {
        const modal = await userService.userFriends(session);
        let friend = [];

        for (const friends of modal) {
            friend.push({
                friend: session == friends.request._id ? friends.user_id : friends.request,
                status: friends.status // Add the status field
            });
        }
        return friend;
    } catch (error) {
        console.log("Error handling friends together:", error);
    }
};


module.exports = {
    setFriends
}