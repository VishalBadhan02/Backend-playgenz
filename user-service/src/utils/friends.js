// utils/friends.js

/**
 * Creates a mapping of friend statuses from friend request data
 * @param {Array} friendRequests - List of friend requests
 * @param {String} session_id - ID of the current user
 * @returns {Object} - Friend status mapping
 */
const getFriendStatusMap = (friendRequests, session_id) => {
    const friendStatusMap = {};
    friendRequests.forEach((request) => {
        const key = request.user_id === session_id ? request.request : request.user_id;
        friendStatusMap[key] = request;
    });
    return friendStatusMap;
};

/**
 * Maps user data and attaches friend status
 * @param {Array} users - List of users
 * @param {Object} friendStatusMap - Friend status mapping
 * @returns {Array} - Processed list of users
 */
const mapUserListWithFriends = (users, friendStatusMap) => {
    return users.map((user) => ({
        ...user.toObject(),
        friends: friendStatusMap[user._id] || null,
    }));
};

module.exports = { getFriendStatusMap, mapUserListWithFriends };
