export * from "@server/emails/sendEmail";

import nodemailer from "nodemailer";
import environment from "@server/environment";
import logger from "@server/logger";

function createEmailClient() {
    if (
        !environment.EMAIL_SMTP_HOST ||
        !environment.EMAIL_SMTP_PORT ||
        !environment.EMAIL_SMTP_USER ||
        !environment.EMAIL_SMTP_PASS
    ) {
        logger.warn(
            "Email SMTP configuration is missing. Emails will not be sent.",
        );
        return;
    }

    return nodemailer.createTransport({
        host: environment.EMAIL_SMTP_HOST,
        port: environment.EMAIL_SMTP_PORT,
        secure: false,
        auth: {
            user: environment.EMAIL_SMTP_USER,
            pass: environment.EMAIL_SMTP_PASS,
        },
    });
}

export const emailClient = createEmailClient();

export default emailClient;
