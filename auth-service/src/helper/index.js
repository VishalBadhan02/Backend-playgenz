const moment = require("moment");
const prisma = require("../prisma/prisma");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../services/JWT");
const client = require("../client");
const { storedOtpModal, getOtp, deleteOtp } = require("../services/redisTokenService");
const { default: redis } = require("../services/redisClient");
const saltRounds = 16;
// const reply = require('./reply');
// const lang = require('../language/en');

const ExistUser = async (userInput) => {
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: userInput },
                { phoneNumber: userInput }
            ]
        }
    });

    return (user) ? { status: false, user } : { status: true };
}





// function to generate otp
const generateOTP = async (email, phone, userId) => {
    // ✅ Ensures a 4-digit OTP
    const oneTimePassword = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedOTP = await bcrypt.hash(oneTimePassword.toString(), saltRounds); // 🔒 Hash OTP

    // Store OTP in Redis for 5 minutes

    // ✅ Store OTP in PostgreSQL using Prisma
    const OTPModule = await prisma.oTP.create({
        data: {
            email: email || null, // If email exists, store it
            phone: phone || null, // If phone exists, store it
            code: hashedOTP, // ✅ Store hashed OTP
            attempts: 0, // Initial attempt count
            isUsed: false, // OTP is not used yet
            expiresAt: moment().add(10, "minutes").toDate(), // ⏳ Expiry after 10 minutes
            userId: userId || null, // Associate OTP with temp user
        }
    });
    if (!OTPModule) false;


    await storedOtpModal(userId, {
        code: hashedOTP,
        attempts: 0,
        id: OTPModule.id
    });// Store OTP in Redis for 5 minutes

    return { otp: oneTimePassword, OTPModule }; // Returning plain OTP for sending via email/SMS
};

// this function only verify the otp
const verifyOTP = async (userId, enteredOTP) => {

    const redisData = await getOtp(userId);
    // ✅ Find latest OTP by email or phone

    console.log("redisData", redisData)

    if (!redisData) {
        return ({ success: false, message: "OTP expired or invalid" });
    }

    const otpData = redisData;
    console.log("otpData", otpData)

    const isMatch = await bcrypt.compare(enteredOTP, otpData.code);

    console.log("isMatch", isMatch)
    // ✅ Compare hashed OTP
    if (!isMatch) {

        if (otpData.attempts >= 5) {
            await redis.del(`otp:${userId}`);
            return { success: false, message: "Too many incorrect attempts. OTP expired." };
        }

        // Increment attempt count
        await prisma.oTP.update({
            where: { id: otpData.id },
            data: { attempts: otpData.attempts + 1 }
        });

        otpData.attempts += 1;

        await redis.set(`otp:${userId}`, JSON.stringify(otpData), 'EX', 60 * 5);


        return { success: false, message: "Invalid OTP" };
    }

    await deleteOtp(userId); // Delete OTP from Redis
    // ✅ Mark OTP as used
    await prisma.oTP.update({
        where: { id: otpData.id },
        data: { isUsed: true }
    });

    return { success: true, message: "OTP verified successfully" };
};

const registerUser = async (id) => {
    try {
        const user = await prisma.tempUser.findUnique({ where: { id } });
        if (!user) {
            return { success: false, message: "User not found" };
        }

        // ✅ Create user in gRPC server(user - service) using Protobuf message format (user.proto)
        const userService = await client.userClient(user)

        if (!userService.success) {
            await prisma.tempUser.delete({
                where: {
                    id: user.id
                }
            });
            console.error("Failed to create user in user-service", userService.message);
            return { success: false, message: "Failed to create user in user-service" };
        }

        // ✅ Generate JWT token
        const token = await generateToken(userService.response.user);

        if (!token) {
            return { success: false, message: "Failed to generate token" };
        }

        // ✅ Store user in User table
        const newUser = await prisma.user.create({
            data: {
                id: user.id,
                name: user.userName,
                phoneNumber: user.phoneNumber,
                email: user.email,
                password: user.password,
                status: "active",
                userType: user.userType,
            }
        });

        if (!newUser) {
            return { success: false, message: "Failed to create user" };
        }

        await prisma.tempUser.delete({
            where: {
                id: user.id
            }
        });

        return { success: true, token };
    } catch (error) {
        console.error("Failed to register user", error);
        return { success: false, message: error.message };
    }
}


const handleUpdate = (user_id, value) => {
    // const dd = new UserModel.updateOne(user_id, value);
}

module.exports = { generateOTP, verifyOTP, registerUser, ExistUser }