const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // Use `true` for port 465, `false` for all other ports
    auth: {
        user: "vishalbadhan81@gmail.com",
        pass: "4j80HA1tMTp69UhD",
    },
});

// async..await is not allowed in global scope, must use a wrapper
const SendMail = async (toemail, subject, message) => {
    // send mail with defined transport object
    const info = await transporter.sendMail({
        from: '"vishalbadhan81@gmail.com', // sender address
        to: toemail, // list of receivers
        subject: subject, // Subject line  
        html: message, // html body
    });
    // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>
}

module.exports = SendMail;
