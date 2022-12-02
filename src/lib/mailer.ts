import nodemailer from "nodemailer";
import { logger } from "@/lib/winston";
// Create a SMTP transport object
// var transport = nodemailer.createTransport("SMTP", {
//     service: 'Hotmail',
//     auth: {
//         user: "username",
//         pass: "password"
//     }
// });
var transport = nodemailer.createTransport({
    service: "gmail",
    // host를 gmail로 설정
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        // Gmail 주소 입력, 'testmail@gmail.com'
        user: process.env.NODEMAILER_USER,
        // Gmail 패스워드 입력
        pass: process.env.NODEMAILER_PASS,
    },
});

// Message object
export const sendMail = async (
    to: string,
    subject: string,
    text: string,
    attachments?: { filename: string; path: string }[]
) => {
    var message = {
        // sender info
        from: process.env.NODEMAILER_USER,
        // Comma separated list of recipients
        to: to,
        // Subject of the message
        subject: subject, //'Nodemailer is unicode friendly ✔',
        // plaintext body
        text: text, //'Hello to myself!',
        // HTML body
        html: text,
    };
    if (attachments && attachments.length > 0) {
        Object.assign(message, { attachments: [...attachments] });
    }
    logger.info("Sending Mail");
    transport.sendMail(message, function (error) {
        if (error) {
            logger.error("Error occured");
            logger.error(error.message);
            return;
        }
        logger.info("Message sent successfully!");
    });
};

export const sendMailWithHtmlImg = async (
    to: string,
    subject: string,
    text: string,
    htmlImgData: string | Buffer,
    attachments?: { filename: string; path: string }[]
) => {
    var message = {
        // sender info
        from: process.env.NODEMAILER_USER,
        // Comma separated list of recipients
        to: to,
        // Subject of the message
        subject: subject,
        // plaintext body
        text: text,
        // HTML body
        html: `<div>${text}<img src='cid:image1@tep.co.kr'></img></div>`,
        attachments: [
            {
                filename: "official_paper.png",
                content: htmlImgData,
                cid: "image1@tep.co.kr",
            },
        ],
    };
    if (attachments && attachments.length > 0) {
        Object.assign(message, { attachments: [...message.attachments, ...attachments] });
    }

    logger.info(`=========== Sending Mail ===============`);
    transport.sendMail(message, function (error) {
        if (error) {
            logger.error("Error occured");
            logger.error(error.message);
            return;
        }
        logger.info("Message sent successfully!");
    });
};
