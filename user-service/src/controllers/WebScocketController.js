const { MessageModel } = require("../models/messageModal");
const { getConversation, storeConversation, deleteConversation, getConversationModal } = require("../services/redisServices");
const userService = require("../services/userService");
const WebSocket = require('ws');

const messageControl = async (ws, datat, wss, userConnections) => {
    try {
        const { matchId, data, subType, to } = datat;
        let status = 0;

        if (!ws.user || !data.message) {
            console.error("Missing required fields");
            return false;
        }

        // Try getting conversationId from Redis
        let conversationId = await getConversation(matchId);

        //if conversationId doesnt exist it measn it might be new coversation and if it is new then need to store it in data base else store id again in redis 
        if (!conversationId) {
            // fetching the data from redis to store in databse if any else simply find
            const participants = await getConversationModal(matchId)

            // finding or storing in the database
            const conversation = await userService.conversationModal(ws.user, to, participants, subType);
            conversationId = conversation._id.toString();

            // Store it in Redis for 1 day
            await storeConversation(conversationId, conversation);
        }

        const modalData = {
            from: ws.user,
            to,
            message: data.message,
            sessionId: ws.user,
            status,
            conversationId: matchId
        };

        const messageData = await userService.messageModal(modalData);

        // Only send to the receiver if they are connected
        const receiverSocket = userConnections.get(to);
        if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {

            receiverSocket.send(JSON.stringify({
                from: messageData?.from,
                to: messageData?.to,
                text: data.message,
                isOwn: false,
                timestamp: new Date(messageData?.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                matchId,
                subType,
                status: messageData.status === 1 ? 'read' : messageData.status === 0 ? 'sent' : 'delivered',
            }));
        }

        // You can also optionally send an echo back to the sender if you want the message to appear instantly in the sender’s chat view:

        ws.send(JSON.stringify({
            from: messageData?.from,
            to: messageData?.to,
            text: data.message,
            isOwn: true,
            timestamp: new Date(messageData?.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            }),
            matchId,
            subType,
            status: messageData.status === 1 ? 'read' : messageData.status === 0 ? 'sent' : 'delivered',
        }));

        return true
    } catch (err) {
        console.log({ msg: "error in backend" }, err);
    }
};



const statusControl = async (ws, data, wss) => {
    try {
        const isOffline = data.data.statusType === "offline"
        if (data.data.statusType === "offline") {
            await UserModel.findOneAndUpdate({ _id: ws.userId }, {
                $set: {
                    active: false
                }
            })

        } else {
            await MessageModel.updateMany(
                {
                    from: data.matchId,
                    to: ws.userId,
                    status: 0
                },
                {
                    $set: {
                        status: 1,
                    }
                }
            );
            await UserModel.findOneAndUpdate({ _id: ws.userId }, {
                $set: {
                    active: true
                }
            })
        }

        if (wss.clients) {
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN
                ) {
                    client.send(JSON.stringify({
                        type: 'message_update',
                        status: isOffline
                    }));
                }
            });
        }
        return
    } catch (error) {
        console.error('Error updating message statuses:', error);
    }


}

module.exports = {
    messageControl,
    statusControl
}
















// const messageControl = async (ws, datat, wss) => {
//     try {
//         const { matchId, data } = datat;

//         if (!ws.user || !data.message) {
//             console.error("Missing required fields");
//             return false;
//         }

//         const senderId = ws.user;
//         const recipientId = matchId;

//         // Check if the conversation is already cached in the WebSocket object


//         // Use the cached conversation for message storage
//         const newMessage = new Message({
//             conversationId: ws.conversation._id,
//             from: senderId,
//             to: recipientId,
//             message: data.message,
//             status: 0 // Assuming 0 indicates 'sent' status
//         });
//         await newMessage.save();

//         // Broadcast the message to relevant clients
//         wss.clients.forEach(client => {
//             if (client.readyState === WebSocket.OPEN &&
//                 (client.user === senderId || client.user === recipientId)) {
//                 client.send(JSON.stringify({
//                     type: 'message_update',
//                     message: newMessage
//                 }));
//             }
//         });

//     } catch (err) {
//         console.error("Error in backend", err);
//     }
// };
