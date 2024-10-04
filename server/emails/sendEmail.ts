import { render } from "@react-email/components";
import { ReactElement } from "react";
import emailClient from "@server/emails";
import logger from "@server/logger";

export async function sendEmail(
    template: ReactElement,
    opts: {
        from: string;
        to: string;
        subject: string;
    },
) {
    if (!emailClient) {
        logger.warn("Email client not configured, skipping email send");
        return;
    }

    const emailHtml = await render(template);

    const options = {
        from: opts.from,
        to: opts.to,
        subject: opts.subject,
        html: emailHtml,
    };

    await emailClient.sendMail(options);

    logger.debug(`Sent email to ${opts.to}`);
}

export default sendEmail;
