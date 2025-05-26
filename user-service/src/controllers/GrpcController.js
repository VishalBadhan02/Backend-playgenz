const grpc = require('@grpc/grpc-js');
const UserModel = require('../models/user');
const { teamClient } = require('../gRPCClient');
const { FriendModel } = require('../models/useFriends');

async function createUser(call, callback) {
    const user = call.request;
    try {
        const newUser = new UserModel({
            _id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            userName: user.userName,
            phoneNumber: user.phoneNumber,
            email: user.email,
            address: user.address,
            userType: user.userType,
            status: "active",
        });
        await newUser.save();



        // Send the created user back to the client
        callback(null, { user: newUser.toObject() });
    } catch (error) {
        console.error("Error creating user:", error);
        // Invoke the callback with the error and return immediately
        callback({
            code: grpc.status.INTERNAL,
            message: 'Internal server error',
            details: error.message,
        });
        return;
    }
}

async function getUser(call, callback) {
    const authId = call.request.user_id;
    try {
        const user = await UserModel.findOne({ _id: authId })

        if (!user) {
            // ✅ Correct status: User not found (404)
            callback({
                code: grpc.status.NOT_FOUND,
                message: 'User not found',
                details: error.message,
            })
        }

        // ✅ Correct status: Found user (200 OK)
        return callback(null, { user: user.toObject() });
    } catch (error) {
        console.error("Error creating user:", error);

        // Invoke the callback with the error and return immediately
        callback({
            code: grpc.status.INTERNAL,
            message: 'Internal server error',
            details: error.message,
        });
        return;
    }
}

const getTeamByUser = (userId) => {
    return new Promise((resolve, reject) => {
        teamClient.getTeamByUser({ user_id: userId }, (error, response) => {
            if (error) {
                console.error('Error fetching team data:', error);

                // ✅ Return appropriate gRPC error codes
                if (error.code === grpc.status.NOT_FOUND) {
                    return reject({
                        code: grpc.status.NOT_FOUND,
                        message: "Team not found for the user.",
                    });
                }
                return reject({
                    code: grpc.status.INTERNAL,
                    message: "Error fetching team data.",
                    details: error.message,
                });

            } else {
                resolve(response);
            }
        });
    });
};

async function checkUniquenes(call, callback) {
    const userName = call.request.userName;

    try {
        const user = await UserModel.findOne({ userName });

        if (user) {
            // ✅ Username already exists, return 409 Conflict
            return callback({
                code: grpc.status.ALREADY_EXISTS,
                message: 'Username is already taken',
                isUnique: false
            });
        }

        // ✅ Username is unique, return success
        return callback(null, { isUnique: true });

    } catch (error) {
        console.error("Error checking username uniqueness:", error);

        // ✅ Only return INTERNAL if there's an actual server error
        return callback({
            code: grpc.status.INTERNAL,
            message: 'Internal server error',
            details: error.message,
        });
    }
}

const getUsersByIds = async (call, callback) => {
    const ids = call.request.users;
    try {
        const users = await UserModel.find({ _id: { $in: ids } }).select(["userName", "profilePicture", "_id", "status", "firstName"]);
        return callback(null, { bulk: users });
    } catch (error) {
        console.error("Error checking username uniqueness:", error);

        // ✅ Only return INTERNAL if there's an actual server error
        return callback({
            code: grpc.status.INTERNAL,
            message: 'Internal server error',
            details: error.message,
        });
    }
}


const handleFriendModalUpdate = async (call, callback) => {
    const _id = call.request._id;
    const action = call.request.action;
    const status = action === "accept" ? 1 : 3
    const commit = action === "accept" ? "request accepted" : "denied"
    console.log(call.request)
    try {
        const friendModal = await FriendModel.findOneAndUpdate(
            { _id },
            { $set: { status, commit } },
            { new: true }
        );

        if (!friendModal) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: 'Friend modal not found',
            });
        }


        return callback(null, { isUnique: true });
    } catch (error) {
        console.error("Error checking username uniqueness:", error);

        // ✅ Only return INTERNAL if there's an actual server error
        return callback({
            code: grpc.status.INTERNAL,
            message: 'Internal server error',
            details: error.message,
        });
    }
}




module.exports = {
    createUser,
    getUser,
    getTeamByUser,
    checkUniquenes,
    getUsersByIds,
    handleFriendModalUpdate
};