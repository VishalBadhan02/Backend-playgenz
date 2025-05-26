require('dotenv').config();

const Config = {
    "HOST": process.env.HOST,
    "PORT": process.env.PORT,
    "GRPC_PORT": process.env.GRPC_PORT,
    "SOCKET_PORT": process.env.SOCKET_PORT,
    "USER_GRPC_PORT": process.env.USER_GRPC_PORT,
    "DATABASE": {
        URL: process.env.DATABASE_URL,
    },
    "JWTSECRETKEY": process.env.JWTACCESSKEY,
    "SECRETACCESSKEY": process.env.SECRETACCESSKEY,
    "ACESSKEYID": process.env.ACESSKEYID,
    "NOTIF_TYPE_REQUEST": process.env.NOTIF_TYPE_REQUEST,
    "NOTIF_MESSAGE": process.env.NOTIF_MESSAGE,
     "KAFKA_BROKERS_PORT": process.env.KAFKA_BROKERS_PORT,
    "KAFKA_BROKERS": process.env.KAFKA_BROKERS,
}

module.exports = Config