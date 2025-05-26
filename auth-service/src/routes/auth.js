const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { verifyJWT } = require('../services/JWT');

router.post("/login", AuthController.login);
router.post("/register", AuthController.Register);
router.post("/otpverify", verifyJWT, AuthController.handleOTpverification);

router.put("/setpassword", AuthController.handleforgot);




module.exports = router;

