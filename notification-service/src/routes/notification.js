const express = require('express')
const route = express.Router();
const NotificationController = require("../controllers/NotificationController")


route.get('/getNotification', NotificationController.getFriendRequest)

route.put('/handleRequest', NotificationController.handleRequest)

module.exports = route;
