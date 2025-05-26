// middlewares/cache.js
const redis = require("../clientServices/redisClient");

function cacheResponse(keyGenerator, expiry = 60) {
    return async (req, res, next) => {
        const key = keyGenerator(req);

        try {
            const cached = await redis.get(key);
            if (cached) {
                return res.status(200).json(JSON.parse(cached));
            }

            res.sendResponse = res.json;
            res.json = async (body) => {
                await redis.set(key, JSON.stringify(body), 'EX', expiry);
                res.sendResponse(body);
            };

            next();
        } catch (err) {
            console.error("Cache middleware error:", err);
            next(); // fall back to actual logic
        }
    };
}

module.exports = cacheResponse;
