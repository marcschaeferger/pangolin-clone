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
    EmailSection,
    EmailSignature,
    EmailText
} from "./components/Email";
import CopyCodeBox from "./components/CopyCodeBox";

interface Props {
    email: string;
    code: string;
    link: string;
}

export const ResetPasswordCode = ({ email, code, link }: Props) => {
    const previewText = `Your password reset code is ${code}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind config={themeColors}>
                <Body className="font-sans">
                    <EmailContainer>
                        <EmailLetterHead />

                        <EmailHeading>Password Reset Request</EmailHeading>

                        <EmailGreeting>Hi {email || "there"},</EmailGreeting>

                        <EmailText>
                            You’ve requested to reset your password. Please{" "}
                            <a href={link} className="text-primary">
                                click here
                            </a>{" "}
                            and follow the instructions to reset your password,
                            or manually enter the following code:
                        </EmailText>

                        <EmailSection>
                            <CopyCodeBox text={code} />
                        </EmailSection>

                        <EmailText>
                            If you didn’t request this, you can safely ignore
                            this email.
                        </EmailText>

                        <EmailFooter>
                            <EmailSignature />
                        </EmailFooter>
                    </EmailContainer>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default ResetPasswordCode;
