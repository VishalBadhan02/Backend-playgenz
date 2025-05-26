const redis = require("../redis/redisClient");


async function storeFixtureRound(cacheKey, enrichedData) {
    try {
        await redis.set(cacheKey, JSON.stringify(enrichedData), 'EX', 180);
    } catch (error) {
        console.error(`Redis store error for key ${cacheKey}:`, error);
    }
}

async function storeTeamDetails(cacheKey, enrichedData) {
    const cachekey = `TeamDetails:${cacheKey}`;
    try {
        await redis.set(cachekey, JSON.stringify(enrichedData), 'EX', 1800);
    } catch (error) {
        console.error(`Redis store error for key ${cacheKey}:`, error);
    }
}

async function storeFixtures(cacheKey, enrichedData) {
    const cachekey = `ScheduledMatches:${cacheKey}`;
    try {
        await redis.set(cachekey, JSON.stringify(enrichedData), 'EX', 1800);
    } catch (error) {
        console.error(`Redis store error for key ${cacheKey}:`, error);
    }
}

async function getFixtureRound(cacheKey) {
    const cachekey = `fixtureKey:${cacheKey}`;
    try {
        const data = await redis.get(cachekey);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Redis get error for key ${cacheKey}:`, error);
        return null;
    }
}

async function getstoredFixtures(cacheKey) {
    const cachekey = `ScheduledMatches:${cacheKey}`;
    try {
        const data = await redis.get(cachekey);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Redis get error for key ${cacheKey}:`, error);
        return null;
    }
}

async function getTeamDetails(cacheKey) {
    const cachekey = `TeamDetails:${cacheKey}`;
    try {
        const data = await redis.get(cachekey);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Redis get error for key ${cacheKey}:`, error);
        return null;
    }
}

async function deleteFixtureRound(cacheKey) {
    try {
        return await redis.del(cacheKey);
    } catch (error) {
        console.error(`Redis get error for key ${cacheKey}:`, error);
        return null;
    }
}

async function deleteTeamDetails(cacheKey) {
    const cachekey = `TeamDetails:${cacheKey}`;
    try {
        return await redis.del(cachekey);
    } catch (error) {
        console.error(`Redis get error for key ${cacheKey}:`, error);
        return null;
    }
}

async function deletestoredFixtures(cacheKey) {
    try {
        return await redis.del(cacheKey);
    } catch (error) {
        console.error(`Redis get error for key ${cacheKey}:`, error);
        return null;
    }
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
    storeFixtureRound,
    getFixtureRound,
    getRefreshToken,
    deleteRefreshToken,
    storeAccessToken,
    storedOtpModal,
    getOtp,
    deleteOtp,
    deleteFixtureRound,
    storeTeamDetails,
    getTeamDetails,
    deleteTeamDetails,
    storeFixtures,
    getstoredFixtures,
    deletestoredFixtures
};

