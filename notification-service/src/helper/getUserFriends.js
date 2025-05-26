const { FriendModel } = require("../models/useFriends");

const setFriends = async (session) => {
    try {
        const modal = await FriendModel.find({
            $or: [
                { user_id: session },
                { request: session }
            ]
        }).populate({
            path: "user_id request",
            select: ["userName", "phoneNumber", "team", "_id", "profilePicture"]
        });

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