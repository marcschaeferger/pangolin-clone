import {
    Body,
    Head,
    Html,
    Preview,
    Tailwind
} from "@react-email/components";
import * as React from "react";
import { themeColors } from "./lib/theme";
import {
    EmailContainer,
    EmailFooter,
    EmailGreeting,
    EmailHeading,
    EmailLetterHead,
    EmailText
} from "./components/Email";

interface Props {
    email: string;
    enabled: boolean;
}

export const TwoFactorAuthNotification = ({ email, enabled }: Props) => {
    const previewText = `Two-Factor Authentication has been ${enabled ? "enabled" : "disabled"}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind config={themeColors}>
                <Body className="font-sans">
                    <EmailContainer>
                        <EmailLetterHead />

                        <EmailHeading>
                            Two-Factor Authentication{" "}
                            {enabled ? "Enabled" : "Disabled"}
                        </EmailHeading>

                        <EmailGreeting>Hi {email || "there"},</EmailGreeting>

                        <EmailText>
                            This email confirms that Two-Factor Authentication
                            has been successfully{" "}
                            {enabled ? "enabled" : "disabled"} on your account.
                        </EmailText>

                        {enabled ? (
                            <EmailText>
                                With Two-Factor Authentication enabled, your
                                account is now more secure. Please ensure you
                                keep your authentication method safe.
                            </EmailText>
                        ) : (
                            <EmailText>
                                With Two-Factor Authentication disabled, your
                                account may be less secure. We recommend
                                enabling it to protect your account.
                            </EmailText>
                        )}

                        <EmailFooter>
                            Best regards,
                            <br />
                            Fossorial
                        </EmailFooter>
                    </EmailContainer>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default TwoFactorAuthNotification;
