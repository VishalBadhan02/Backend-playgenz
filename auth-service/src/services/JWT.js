const jwt = require('jsonwebtoken');
// const Config = require('../config/index')
const Config = {
    JWTSECRETKEY: "vishal123"
}

const generateToken = (user) => {
    const payload = {
        _id: user.id || user._id,
        email: user.email,
        userType: user.userType,
        userName: user?.userName,
        createdAt: new Date(),
        expireAt: new Date(Date.now() + 10 * 60 * 1000), // Token expires in 10 minutes
    };
    const token = jwt.sign(payload, Config.JWTSECRETKEY);
    return token;
};

const verifyJWT = (req, res, next) => {
    const token = req?.headers?.authorization;

    if (!token) {
        return res.json({ status: false, msg: "Token not verified" })
    }

    const decoded = jwt.verify(token, Config.JWTSECRETKEY);
    if (!decoded) {
        return res.json({ status: false, msg: "token wrong or expired" })
    }

    req.user = decoded;
    next();

}

module.exports = {
    generateToken, verifyJWT
}

