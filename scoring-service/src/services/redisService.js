const redis = require("../redis/redisClient");

const storeUsers = async (cachekey, enrichedTeam) => {
    const cacheKey = `scoreusersservice:${cachekey}`;
    try {
        await redis.set(cacheKey, JSON.stringify(enrichedTeam), 'EX', 500);
    } catch (error) {
        console.error(`Redis store error for key ${cacheKey}:`, error);
    }

}
const getCacheUsers = async (cachekey) => {
    const cacheKey = `scoreusersservice:${cachekey}`;
    try {
        const data = await redis.get(cacheKey);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Redis store error for key ${cacheKey}:`, error);
    }

}
const deleteUsers = async (cachekey) => {
    const cacheKey = `scoreusersservice:${cachekey}`;
    try {
        return await redis.del(cacheKey);
    } catch (error) {
        console.error(`Redis store error for key ${cacheKey}:`, error);
    }
}

module.exports = {
    storeUsers,
    getCacheUsers,
    deleteUsers
};