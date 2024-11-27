import { render } from "@react-email/render";
import { ReactElement } from "react";
import emailClient from "@server/emails";
import logger from "@server/logger";

export async function sendEmail(
    template: ReactElement,
    opts: {
        from: string | undefined;
        to: string | undefined;
        subject: string;
    },
) {
    if (!emailClient) {
        logger.warn("Email client not configured, skipping email send");
        return;
    }

    if (!opts.from || !opts.to || !opts.subject) {
        logger.error("Email missing required fields", opts);
        return;
    }

    logger.debug("Rendering email templatee...")
    const emailHtml = await render(template);
    logger.debug("Done rendering email templatee")

    const options = {
        from: opts.from,
        to: opts.to,
        subject: opts.subject,
        html: emailHtml,
    };

    await emailClient.sendMail(options);
}

export default sendEmail;
