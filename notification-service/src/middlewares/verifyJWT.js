const jwt = require("jsonwebtoken");
const Config = require("../config");
require('dotenv').config();

const JWT_SECRET = Config.JWTSECRETKEY;

const verifyJWT = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Extract token

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach decoded user info to request

        next(); // Allow request to proceed
    } catch (err) {
        return res.status(403).json({ message: "Forbidden: Invalid token" });
    }
};

module.exports = verifyJWT;
