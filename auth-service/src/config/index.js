require('dotenv').config();

const Config = {
    "HOST": process.env.HOST,
    "PORT": process.env.PORT,
    "REDIS_PORT": process.env.REDIS_PORT,
    "REDIS_HOST": process.env.REDIS_HOST,
    "JWTSECRETKEY": process.env.JWTACCESSKEY,
     "USER_GRPC_PORT": process.env.USER_GRPC_PORT,
    "USER_GRPC_HOST": process.env.USER_GRPC_HOST,
    "DATABASE": {
        URL: process.env.DATABASE_URL,
    },
    "JWTSECRETKEY": process.env.JWTACCESSKEY,
    "SECRETACCESSKEY": process.env.SECRETACCESSKEY,
    "ACESSKEYID": process.env.ACESSKEYID,
    "NOTIF_TYPE_REQUEST": process.env.NOTIF_TYPE_REQUEST,
    "NOTIF_MESSAGE": process.env.NOTIF_MESSAGE,
    "REDIS_PORT": process.env.REDIS_PORT,
    "REDIS_HOST": process.env.REDIS_HOST,
    "REDIS_PROFILE_KEY": process.env.REDIS_PROFILE_KEY,
    "CHALLENGE_MESSAGE": process.env.CHALLENGE_MESSAGE,
     "KAFKA_BROKERS_PORT": process.env.KAFKA_BROKERS_PORT,
    "KAFKA_BROKERS": process.env.KAFKA_BROKERS,
}

module.exports = Config