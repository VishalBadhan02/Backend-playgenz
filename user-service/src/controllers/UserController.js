const reply = require("../helper/reply");
const Lang = require("../language/en")
const UserModel = require("../models/user")
const { getTeamByUser } = require("./GrpcController");
const { setFriends } = require("../helper/getUserFriends");
const userService = require("../services/userService");
const { getFriendStatusMap, mapUserListWithFriends } = require("../utils/friends");
const WebSocket = require('ws');
const sendMessage = require("../kafka/producer");
const { MessageModel } = require("../models/messageModal");
const { getParticipantsWithDetails } = require("../utils/groupParticipents");
const messageService = require("../services/messageService");
const Config = require("../config");
const Conversation = require("../models/conversationSchema");
const { storeConversationModal, getConversationModal } = require("../services/redisServices");
const { getParticipantDisplayData } = require("../utils/getParticipantDisplayData");
const { formatedChatData } = require("../utils/formatedChatData");





const getProfile = async (req, res) => {
    let userId;
    if (req.params.id) {
        userId = req.params.id;
    } else {
        userId = req.user?._id;
    }


    try {
        // const user = await UserModel.findOne({ _id: userId });
        const user = await userService.findUser(userId);

        if (!user) {
            return res.status(409).json(reply.failure(Lang.USER_NOT_FOUND));
        }

        const teams = await getTeamByUser(userId)
            .then((teamData) => {
                return teamData;
                // Process the team data as needed
            })
            .catch((error) => {
                console.error('Failed to retrieve team data:', error);
                // Handle the error appropriately
            });

        // fetch user friends from friends modal
        const friends = await setFriends(userId)

        //this check wheathee current user is user frient or not on profile page
        const checkCurrentPage = await userService.userFriendForCurrentPage(req.user._id, userId)


        user.userTeams = teams.teams
        user.friends = friends
        user.friend = checkCurrentPage

        return res.status(200).json(reply.success(Lang.USER_PROFILE, user));
    } catch (err) {
        console.log("Error in getProfile", err)
        return res.status(500).json(reply.failure(err.message));
    }
};

const searchUsers = async (req, res) => {
    try {
        const session_id = req.user._id;
        const searchTerm = req.query.q || '';

        if (!session_id) {
            return res.status(401).json(reply.failure("Unauthorized: User not authenticated"));
        }

        // ✅ Fetch users excluding the session user
        const users = await userService.findFriends(session_id, searchTerm);

        // ✅ Fetch friend requests
        const friendRequests = await userService.friendRequests(session_id);

        // if (!users.length) {
        //     return res.status(404).json(reply.failure("No users found"));
        // }

        // ✅ Process friend status using utility function
        const friendStatusMap = getFriendStatusMap(friendRequests, session_id);

        // ✅ Process user list using utility function
        const userList = mapUserListWithFriends(users, friendStatusMap);

        const check = friendRequests.filter((request) => request.request === session_id);

        return res.status(200).json(reply.success("Users fetched successfully", { users: userList, check }));

    } catch (err) {
        console.error("Error fetching friends:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const UpdateProfile = async (req, res) => {
    try {
        const { userName, email, phoneNumber, address } = req.body;
        const updateData = { userName, email, phoneNumber, address };

        if (req.file) {
            updateData.profilePicture = req.file.location; // S3 URL
        }


        // ✅ Ensure user ID exists
        if (!req.user || !req.user._id) {
            return res.status(401).json(reply.failure(Lang.UNAUTHORIZED));
        }

        // ✅ Validate Input (Optional but Recommended)
        if (!userName && !email && !phoneNumber && !address) {
            return res.status(400).json(reply.failure("No valid fields to update"));
        }

        const uniqueUserName = await userService.UniqueUserName(req.user._id, userName)

        if (!uniqueUserName) {
            return res.status(400).json(reply.failure({ type: "userName", message: Lang.USER_NAME_EXIST }));
        }


        // ✅ Update User Profile
        const updatedUser = await userService.updateProfile(req.user._id, updateData);

        if (!updatedUser) {
            return res.status(404).json(reply.failure(Lang.USER_NOT_FOUND));
        }

        return res.status(200).json(reply.success(Lang.USER_UPDATED, { user: updatedUser }));
    } catch (err) {
        console.error("Error updating profile:", err);
        return res.status(500).json(reply.failure("Internal Server Error"));
    }
};

const handleRequest = async (req, res) => {
    try {
        const { request } = req.body;

        if (!request) {
            return res.status(400).json({ error: "Receiver ID is required" });
        }

        // Find sender user details
        const user = await userService.findUser(req.user._id)
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Prepare friend request data
        const friendRequestData = {
            user_id: req.user._id,
            request: request,
            status: 0,
            commit: "add request",
            type: "request"
        }

        const friendRequest = await userService.addFriend(friendRequestData)
        if (!friendRequest) {
            return res.status(500).json({ error: "Failed to create friend request" });
        }

        const notificationData = {
            receiverId: request,           // Who receives this notification
            actorId: req.user._id,               // Who triggered the action
            type: Config.NOTIF_TYPE_REQUEST,// Type of notification (friend_request)
            entityId: friendRequest._id,// ID of the related entity (match, team, tournament, etc.)
            message: Config.NOTIF_MESSAGE,  // Readable message
            status: 0,                 // Status: unread, read, dismissed
            data: {
                type: "friend_request",
                name: user?.userName
            }
        }

        await sendMessage("friend-request", notificationData)
        return res.json(reply.success())
    } catch (err) {
        res.json({ error: err.message });
    }
}

const handleDelete = async (req, res) => {
    try {
        const { _id } = req.body;
        // This service update the FriendModal means by updating this you will delete user from you friends list
        const friendRequest = await userService.friendModelDelete(_id)

        if (friendRequest.operation === "delete") {
            console.log("here")
            await sendMessage("delete-request", { entityId: friendRequest?.friendRequest?._id, operation: "delete" })
            return res.json(reply.success())

        }

        await sendMessage("delete-request", { entityId: friendRequest?._id })
        //notification send to the other user
        // await sendMessage("update-request", { entityId: modal._id, type: "unFriend" })

        // await NotificationModel.findOneAndDelete({ type_id: _id })
        return res.json(reply.success())
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


const handleApproval = async (req, res) => {
    try {
        const { approvalData } = req.body
        // This service update the FriendModal means by updating this you will get friends of the other user
        const modal = await userService.friendModelUpdate(approvalData, 1, "request accepted")

        // notification send to the other user
        await sendMessage("update-request", { entityId: modal._id, type: "request accepted", status: 0 })

        return res.json(reply.success("Approved"))
    } catch (err) {
        return res.json(err)
    }
}

const getUserFriends = async (req, res) => {
    try {
        const user_id = req.user._id;
        const { t, id } = req.params;
        // If this is a new conversation request
        if (t === "n") {
            // getting the data for cache
            const cacheData = await getConversationModal(id)

            // if exist then user cache data else find it in the checkConvo mens in databse
            let existingConvo = cacheData ? cacheData : await messageService.checkConvo(user_id, id);

            //initializing the 
            let participants; participants

            //if coversation is not exist then we are creating new and store it in redis
            if (!existingConvo) {

                // formating the data to store in the database 
                participants = [
                    { entityId: user_id, entityType: "user" },
                    { entityId: id, entityType: "user" }
                ];

                // modal maked to store in the data base
                existingConvo = new Conversation({
                    participants: participants,
                    type: 'one-on-one',
                })
                // console.log(existingConvo)
                await storeConversationModal(existingConvo?._id, existingConvo)
            }
            const lastMsg = await messageService.getLastMessageForConversation(id);

            const displayData = await getParticipantDisplayData(existingConvo.participants, user_id);

            const data = {
                _id: existingConvo?._id,
                name: displayData?.name || "unknown",
                avatar: displayData?.profilePicture || "",
                status: "",
                lastMessage: lastMsg || "",
                lastMessageTime: "",
                unreadCount: 0,
                isTyping: false,
                type: "user"
            };

            return res.status(202).json(reply.success(Lang.SUCCESS, { userData: data, t }));
        }

        // Else, fetch contacts and friends
        const [userFriends, userTeams, userContacts] = await Promise.all([
            setFriends(user_id),
            //frtching the teams registered by the user
            getTeamByUser(user_id).catch(err => {
                console.error("Failed to retrieve team data:", err);
                return [];
            }),
            // fetching the conversations of the users
            userService.getUserContacts(user_id)
        ]);


        //formating the data assigning the names according to the id's
        const userChats = await getParticipantsWithDetails(userContacts, user_id);



        return res.status(202).json(reply.success(Lang.SUCCESS, {
            userFriends,
            userTeams,
            userChats
        }));

    } catch (err) {
        console.error("getUserFriends error:", err);
        return res.status(500).json({ error: err.message || "Server Error" });
    }
};



const getChat = async (req, res) => {
    try {
        const { conversationId } = req.params

        const chat = await messageService.getMessage(conversationId)

        const formatedChats = await formatedChatData(chat, req.user._id)


        return res.status(202).json(reply.success("Message fetched Succesfully", formatedChats));
    } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ message: 'Error fetching messages' });
    }
};

// const getPlayingFriends = async (req, res) => {
//     try {
//         const user_id = req.user._id;
//         const friends = await FriendModel.find({ user_id: user_id })
//             .populate({ path: "request", select: ["userName", "phoneNumber", "team", "_id"] })
//         const friend = await FriendModel.find({ request: user_id })
//             .populate({ path: "user_id", select: ["userName", "phoneNumber", "team", "_id"] })

//         for (let i = 0; i < friends.length; i++) {
//             const data = await AddTeamMemberModel.findOne({ player_id: friends[i].request._id })
//             friend[i].friends = (data) ? data : null
//         }

//         for (let i = 0; i < friend.length; i++) {
//             const data = await AddTeamMemberModel.findOne({ player_id: friend[i].user_id._id })
//             friend[i].friends = (data) ? data : null
//         }

//         return res.json({ friends, friend });

//     } catch (err) {
//         return res.status(500).json({ error: err.message });
//     }
// };






// const getPlayers = async (req, res) => {
//     try {
//         if (req.params.type === "joinTeam") {
//             const addedPlayer = await AddTeamMemberModel.find({ playerId: req.user._id })
//             if (!addedPlayer) {
//                 return res.json(reply.failure("Fetched Scuccesfuly"))
//             }
//             return res.json(reply.success("Fetched Scuccesfuly", addedPlayer))

//         }
//         const addedPlayer = await AddTeamMemberModel.find({ userId: req.user._id }).populate({ path: "playerId", select: ["userName", "_id"] })
//         return res.json(reply.success("Fetched Scuccesfuly", addedPlayer))
//     } catch (err) {
//         return res.json(err)
//     }
// }


module.exports = {
    getProfile,
    searchUsers,
    UpdateProfile,
    handleRequest,
    handleDelete,
    handleApproval,
    getUserFriends,
    getChat
    //     addFriend, getPlayers, getPlayingFriends, statusControl 


}













