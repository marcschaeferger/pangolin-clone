export * from "@server/emails/sendEmail";

import nodemailer from "nodemailer";
import config from "@server/config";
import logger from "@server/logger";

function createEmailClient() {
    if (
        !config.email?.smtp_host ||
        !config.email?.smtp_pass ||
        !config.email?.smtp_port ||
        !config.email?.smtp_user
    ) {
        logger.warn(
            "Email SMTP configuration is missing. Emails will not be sent.",
        );
        return;
    }

    return nodemailer.createTransport({
        host: config.email.smtp_host,
        port: config.email.smtp_port,
        secure: false,
        auth: {
            user: config.email.smtp_user,
            pass: config.email.smtp_pass,
        },
    });
}

export const emailClient = createEmailClient();

export default emailClient;
