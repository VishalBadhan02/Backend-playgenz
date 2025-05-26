const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const LocationController = require('../controllers/LocationController');
const upload = require('../middlewares/multer');


{
    router.get("/getProfile/:id?", UserController.getProfile);
    router.get("/getcountry", LocationController.getcountry);
    router.get("/getstate/:country", LocationController.getstate);
    router.get("/getcity/:state", LocationController.getcity);
    router.get("/searching", UserController.searchUsers)
    router.get("/userFriends/:t?/:id?", UserController.getUserFriends)
    // router.get("/playingOnes", UserController.getPlayingFriends)
    // router.get("/getPlayer/:type?", UserController.getPlayers)
    router.get("/getChat/:conversationId?", UserController.getChat)
    // router.get("/getRecievedMessages", UserController.getRecivedMessage)
}

{
    router.post("/friendRequest", UserController.handleRequest)
}

{
    router.delete("/deleteFriendRequest", UserController.handleDelete)
}

{
    router.put("/approvalRequest", UserController.handleApproval)
    router.put("/updateProfile", upload.single('profilePicture'), UserController.UpdateProfile);
}


module.exports = router;

