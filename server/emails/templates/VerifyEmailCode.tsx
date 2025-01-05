import { Body, Head, Html, Preview, Tailwind } from "@react-email/components";
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

interface VerifyEmailProps {
    username?: string;
    verificationCode: string;
    verifyLink: string;
}

export const VerifyEmail = ({
    username,
    verificationCode,
    verifyLink
}: VerifyEmailProps) => {
    const previewText = `Your verification code is ${verificationCode}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind config={themeColors}>
                <Body className="font-sans">
                    <EmailContainer>
                        <EmailLetterHead />

                        <EmailHeading>Please Verify Your Email</EmailHeading>

                        <EmailGreeting>Hi {username || "there"},</EmailGreeting>

                        <EmailText>
                            You’ve requested to verify your email. Please use
                            the code below to complete the verification process
                            upon logging in.
                        </EmailText>

                        <EmailSection>
                            <CopyCodeBox text={verificationCode} />
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

export default VerifyEmail;
