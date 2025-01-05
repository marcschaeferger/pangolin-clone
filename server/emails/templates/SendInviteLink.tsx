import {
    Body,
    Head,
    Html,
    Preview,
    Tailwind,
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
import ButtonLink from "./components/ButtonLink";

interface SendInviteLinkProps {
    email: string;
    inviteLink: string;
    orgName: string;
    inviterName?: string;
    expiresInDays: string;
}

export const SendInviteLink = ({
    email,
    inviteLink,
    orgName,
    inviterName,
    expiresInDays
}: SendInviteLinkProps) => {
    const previewText = `${inviterName} invited you to join ${orgName}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind config={themeColors}>
                <Body className="font-sans">
                    <EmailContainer>
                        <EmailLetterHead />

                        <EmailHeading>Invited to Join {orgName}</EmailHeading>

                        <EmailGreeting>Hi {email || "there"},</EmailGreeting>

                        <EmailText>
                            You’ve been invited to join the organization{" "}
                            <strong>{orgName}</strong>
                            {inviterName ? ` by ${inviterName}.` : "."} Please
                            access the link below to accept the invite.
                        </EmailText>

                        <EmailText>
                            This invite will expire in{" "}
                            <strong>
                                {expiresInDays}{" "}
                                {expiresInDays === "1" ? "day" : "days"}.
                            </strong>
                        </EmailText>

                        <EmailSection>
                            <ButtonLink href={inviteLink}>
                                Accept Invite to {orgName}
                            </ButtonLink>
                        </EmailSection>

                        <EmailFooter>
                            <EmailSignature />
                        </EmailFooter>
                    </EmailContainer>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default SendInviteLink;
