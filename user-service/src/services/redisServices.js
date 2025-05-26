const { redis } = require('../clients/redisClient');

async function storeConversation(conversationId, data) {
    await redis.set(`conversation:${conversationId}`, JSON.stringify(data), 'EX', 60 * 60 * 24); // 1 day
}

const getConversation = async (cacheKey) => {
    const key = `conversation:${cacheKey}`;
    const conversation = await redis.get(key);

    if (conversation) {
        // Reheat: Extend expiry to 1 more day if it's being used
        await redis.expire(key, 60 * 60 * 24);
    }

    return conversation;
};

const deleteConversation = async (userId) => {
    await redis.del(`conversation:${userId}`);
}
const storeAccessToken = async (userId, token) => {
    await redis.set(`access:${userId}`, token, 'EX', 60 * 15); // 15 minutes
}

async function storeConversationModal(key, ConversationModalData) {
    await redis.set(`ConversationModal:${key}`, JSON.stringify(ConversationModalData), 'EX', 60 * 60 * 24); // 1 day
}

const getConversationModal = async (cacheKey) => {
    const key = `ConversationModal:${cacheKey}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
};

const deleteConversationModal = async (cacheKey) => {
    await redis.del(`ConversationModal:${cacheKey}`);
}
module.exports = {
    storeConversation,
    getConversation,
    deleteConversation,
    storeAccessToken,
    storeConversationModal,
    getConversationModal,
    deleteConversationModal
};