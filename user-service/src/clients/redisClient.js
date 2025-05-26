const Redis = require("ioredis");
const Config = require("../config");

const redis = new Redis({
    host: Config.REDIS_HOST,
    port: Config.REDIS_PORT,
    //   password: process.env.REDIS_PASSWORD,
});

redis.on("connect", () => {
    console.log("✅ Redis connected");
});

redis.on("error", (err) => {
    console.error("❌ Redis connection error:", err);
});

module.exports = { redis };
