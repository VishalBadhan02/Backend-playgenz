
const redis = require("./redisClient");

async function storeRefreshToken(userId, token) {
    await redis.set(`refresh:${userId}`, token, 'EX', 60 * 60 * 24 * 30); // 30 days
}

async function getRefreshToken(userId) {
    return await redis.get(`refresh:${userId}`); // Get the refresh token for the user
}

async function deleteRefreshToken(userId) {
    await redis.del(`refresh:${userId}`); // Delete the refresh token for the user
}

async function storeAccessToken(userId, token) {
    await redis.set(`access:${userId}`, token, 'EX', 60 * 15); // 15 minutes
}

async function storedOtpModal(userId, data) {
    await redis.set(
        `otp:${userId}`,
        JSON.stringify({
            code: data.code,         // Hashed OTP
            attempts: data.attempts, // For limit tracking
            id: data.id,         // OTP ID
        }),
        'EX',
        60 * 5 // 5 minutes
    );
}

async function getOtp(userId) {
    const data = await redis.get(`otp:${userId}`);
    return JSON.parse(data);
}

async function deleteOtp(userId) {
    await redis.del(`otp:${userId}`); // Delete the OTP for the user
}

module.exports = {
    storeRefreshToken,
    getRefreshToken,
    deleteRefreshToken,
    storeAccessToken,
    storedOtpModal,
    getOtp,
    deleteOtp
};

