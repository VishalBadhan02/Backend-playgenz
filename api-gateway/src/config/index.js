require('dotenv').config();

const Config = {
    PORT: process.env.PORT,
    HOST: process.env.HOST,
    SOCKET_PORT: process.env.SOCKET_PORT,

    auth: `http://${process.env.AUTH_SERVICE_HOST}:${process.env.AUTH_PORT}`,
    user: `http://${process.env.USER_SERVICE_HOST}:${process.env.USER_PORT}`,
    tournament: `http://${process.env.TOURNAMENT_SERVICE_HOST}:${process.env.TOURNAMENT_PORT}`,
    product: `http://${process.env.PRODUCT_SERVICE_HOST}:${process.env.PRODUCT_PORT}`,
    scoring: `http://${process.env.SCORING_SERVICE_HOST}:${process.env.SCORING_PORT}`,
    team: `http://${process.env.TEAM_SERVICE_HOST}:${process.env.TEAM_PORT}`,
    venue: `http://${process.env.VENUE_SERVICE_HOST}:${process.env.VENUE_PORT}`,
    notification: `http://${process.env.NOTIFICATION_SERVICE_HOST}:${process.env.NOTIFICATION_PORT}`
}

module.exports = Config