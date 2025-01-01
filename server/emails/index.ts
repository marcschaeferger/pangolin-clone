export * from "@server/emails/sendEmail";

import nodemailer from "nodemailer";
import config from "@server/config";
import logger from "@server/logger";

function createEmailClient() {
    const emailConfig = config.getRawConfig().email;
if (
    !emailConfig?.smtp_host ||
    !emailConfig?.smtp_pass ||
    !emailConfig?.smtp_port ||
    !emailConfig?.smtp_user
) {
    logger.warn(
        "Email SMTP configuration is missing. Emails will not be sent.",
    );
    return;
}

    return nodemailer.createTransport({
        host: emailConfig.smtp_host,
        port: emailConfig.smtp_port,
        secure: false,
        auth: {
            user: emailConfig.smtp_user,
            pass: emailConfig.smtp_pass,
        },
    });
}

export const emailClient = createEmailClient();

export default emailClient;
