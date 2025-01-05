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
}

export const ConfirmPasswordReset = ({ email }: Props) => {
    const previewText = `Your password has been reset`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind config={themeColors}>
                <Body className="font-sans relative">
                    <EmailContainer>
                        <EmailLetterHead />

                        <EmailHeading>Password Reset Confirmation</EmailHeading>

                        <EmailGreeting>Hi {email || "there"},</EmailGreeting>

                        <EmailText>
                            This email confirms that your password has just been
                            reset. If you made this change, no further action is
                            required.
                        </EmailText>

                        <EmailText>
                            Thank you for keeping your account secure.
                        </EmailText>

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

export default ConfirmPasswordReset;
