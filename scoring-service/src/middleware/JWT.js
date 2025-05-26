const jwt = require("jsonwebtoken");
const Config = require("../config");


const verifyJWT = (req, res, next) => {
    const token = req?.headers?.authorization?.split(" ")[1]
        || req?.headers['sec-websocket-protocol']; // Extract token

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    try {
        const decoded = jwt.verify(token, Config.JWTSECRETKEY);
        req.user = decoded; // Attach decoded user info to request

        next(); // Allow request to proceed
    } catch (err) {
        return res.status(403).json({ message: "Forbidden: Invalid token" });
    }
};

module.exports = verifyJWT;
