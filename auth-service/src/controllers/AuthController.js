const reply = require('../helper/reply');
const lang = require('../language/en');
const { generateToken } = require('../services/JWT');
const Lang = require('../language/en');
const { generateOTP, verifyOTP, registerUser, ExistUser } = require('../helper/index')
const SendMail = require('../services/mail')
const Bcrypt = require("bcryptjs")
const saltRounds = 16;
const prisma = require('../prisma/prisma');
const { getUser } = require('../client');
const { UniqueUserName } = require("../client");

const { getRefreshToken, storeRefreshToken } = require("../services/redisTokenService");

const login = async (req, res) => {
    const { password, emailOrPhone } = req.body;

    try {
        let data = emailOrPhone.includes("@")
            ? { type: "email", message: lang.LOGIN_NOTFOUND }
            : { type: "phone", message: lang.INCORRECT_NUMBER };

        const Validation = await ExistUser(emailOrPhone);

        if (Validation.status) {
            console.log("Validation failed");
            return res.status(404).json(reply.failure(data));
        }

        const user = Validation?.user;

        const isMatch = await Bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res
                .status(404)
                .json(reply.failure({ type: "password", message: lang.PASSWORD_NOTFOUND }));
        }

        // ✅ Check if refresh token already exists
        const existingRefreshToken = await getRefreshToken(user.id);

        let refreshToken;

        if (existingRefreshToken) {
            // Optionally, you can verify if the token is still valid (if using JWT)
            console.log("Existing refresh token found.");
            refreshToken = existingRefreshToken;

            // 🔁 Optional: Replace old token with new one
            // refreshToken = generateToken(user); // Uncomment this if you want to always issue a new token
            // await storeRefreshToken(user.id, refreshToken);
        } else {
            refreshToken = generateToken(user); // JWT or any method
            storeRefreshToken(user.id, refreshToken);
        }

        return res
            .status(200)
            .json(reply.success(lang.LOGIN_SUCCESS, { token: refreshToken, type: req.body.type }));

    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json(reply.failure(err.message));
    }
};


// const login = async (req, res) => {
//     const { password, emailOrPhone } = req.body;
//     try {
//         let data = emailOrPhone.includes("@") ? { type: "email", message: lang.LOGIN_NOTFOUND } : { type: "phone", message: lang.INCORRECT_NUMBER }

//         const Validation = await ExistUser(emailOrPhone)


//         if (Validation.status) {
//             console.log("Validation failed")
//             return res.status(404).json(reply.failure(data))
//         }

//         const user = Validation?.user

//         const isMatch = await Bcrypt.compare(password, user.password);

//         if (!isMatch) {
//             return res.status(404).json(reply.failure({ type: "password", message: lang.PASSWORD_NOTFOUND }))
//         }

//         const token = generateToken(user);

//         storeRefreshToken(user.id, token);
//         if (!token) {
//             return res.status(500).json(reply.failure(lang.PASSWORD_NOTFOUND))
//         }
//         return res.status(200).json(reply.success(Lang.LOGIN_SUCCESS, { token: token, type: req.body.type }))
//     }
//     catch (err) {
//         return res.status(500).json(reply.failure(err.message));
//     }
// }

const Register = async (req, res) => {
    //Extract user data safely
    const { firstName, lastName, userName, email, phoneNumber, password, address, userType } = req.body;

    // Input Validation (Prevent Empty Fields)
    if (!firstName || !lastName || !email || !password || !address || !userName) {
        return res.status(400).json(reply.error(lang.MISSING_FIELDS));
    }

    const emialCheck = await ExistUser(email)
    const numberCheck = await ExistUser(phoneNumber)
    const UniqueUser = await UniqueUserName(userName)

    if (!UniqueUser.success) {
        return res.status(502).json(reply.failure("Error connecting with user gRPC"));
    }


    if (!emialCheck) {
        return res.status(409).json(reply.failure({ type: "email", message: lang.EMAIL_CHECK }));
    } else if (!numberCheck) {
        return res.status(409).json(reply.failure({ type: "phone", message: lang.PHONE_CHECK }));
    } else if (!UniqueUser.response.isUnique) {
        return res.status(409).json(reply.failure({ type: "userName", message: lang.USER_NAME_EXIST }));
    }

    console.log(UniqueUser.response.isUnique)


    // // ✅ Hash password securely
    const hashedPassword = await Bcrypt.hash(password, saltRounds);

    try {
        // ✅ Store user in TempUser table
        const user = await prisma.tempUser.create({
            data: {
                firstName,
                lastName,
                userName,
                email,
                phoneNumber,
                password: hashedPassword,
                address,
                status: "pending",
                userType: userType || "user", // Default to 'user'
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            }
        });

        if (!user) {
            return res.status(500).json(reply.failure("Failed to create user"));
        }

        // Generate OTP
        const module = await generateOTP(user.email, user.phoneNumber, user.id);

        console.log(module.otp)

        if (!module) {
            return res.status(500).json(reply.failure(lang.OTP_FAILED));
        }
        // Send OTP via Email or SMS
        // await SendMail(user.email, "opt", "your otp is " + module);

        // Generate JWT Token
        const token = await generateToken({ id: user.id, email: user.email, userType: user.userType });
        if (!token) {
            return res.status(500).json(reply.failure(lang.TOKEN_FAILED));
        }

        return (
            res.status(202).json(reply.success(Lang.LOGIN_SUCCESS, { token, email: user.email, phoneNumber: req.body.phoneNumber }))
        )
    } catch (err) {
        console.log("Error registering new user", err.message)
        return res.status(500).json(reply.failure(err.message));
    }
}





const handleOTpverification = async (req, res) => {
    try {
        const { otp } = req.body;

        if (!req.user._id) {
            return res.status(200).json(reply.failure("id not found"))
        }

        const isverified = await verifyOTP(req.user._id, otp);

        console.log(isverified)

        if (!isverified) {
            return res.json(reply.failure(lang.OTP_FAILED))
        }

        const registerUse = await registerUser(req.user._id);

        console.log("token here", registerUse)

        if (!registerUse.success) {
            return res.json(reply.failure(lang.REGISTER_FAILED))
        }

        return res.json(reply.success(lang.OTP_VERIFY, { token: registerUse.token }))
    } catch (error) {
        console.log("Error occuring in the handleOTpverification", error.message)
        return res.status(500).json(reply.failure(error.message));

    }

}



const handleforgot = async (req, res) => {
    try {
        const { emailOrPhone } = req.body;

        let data = emailOrPhone.includes("@") ? { type: "email", message: lang.LOGIN_NOTFOUND } : { type: "phone", message: lang.INCORRECT_NUMBER }

        const Validation = await ExistUser(emailOrPhone)

        if (!Validation) {
            return res.status(404).json(reply.failure(data))
        }

        const module = await generateOTP(Validation.user.email, Validation.user.phoneNumber, Validation.user.id,);

        if (!module) {
            return res.status(500).json(reply.failure(lang.OTP_FAILED));
        }
        // await SendMail(user.email, "opt", "your otp is " + module);
        return res.status(204).json(reply.success(lang.OTP_SEND))
    } catch (error) {
        console.log("Error occuring in forgot password", error.message)
        return res.status(500).json(reply.failure(err.message));
    }
}

const handleUpdatePassword = async () => {
    try {
        const user = await prisma.user.update({
            where: {
                id: id
            }, set: {

            }
        })
    } catch (error) {
        console.log("Error occuring in updating password", error.message)
        return res.status(500).json(reply.failure(err.message));
    }
}


module.exports = { login, Register, handleOTpverification, handleforgot, handleUpdatePassword }