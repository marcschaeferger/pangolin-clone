import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Tailwind,
    Button,
} from "@react-email/components";
import * as React from "react";

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
    expiresInDays,
}: SendInviteLinkProps) => {
    const previewText = `${inviterName} invited to join ${orgName}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="font-sans">
                    <Container className="bg-white border border-solid border-gray-200 p-6 max-w-lg mx-auto my-8">
                        <Heading className="text-2xl font-semibold text-gray-800 text-center">
                            You're invited to join a Fossorial organization
                        </Heading>
                        <Text className="text-base text-gray-700 mt-4">
                            Hi {email || "there"},
                        </Text>
                        <Text className="text-base text-gray-700 mt-2">
                            You’ve been invited to join the organization{" "}
                            {orgName}
                            {inviterName ? ` by ${inviterName}.` : "."} Please
                            access the link below to accept the invite.
                        </Text>
                        <Text className="text-base text-gray-700 mt-2">
                            This invite will expire in{" "}
                            <b>
                                {expiresInDays}{" "}
                                {expiresInDays === "1" ? "day" : "days"}.
                            </b>
                        </Text>
                        <Section className="text-center my-6">
                            <Button
                                href={inviteLink}
                                className="rounded-md bg-gray-600 px-[12px] py-[12px] text-center font-semibold text-white cursor-pointer"
                            >
                                Accept invitation to {orgName}
                            </Button>
                        </Section>
                        <Text className="text-sm text-gray-500 mt-6">
                            Best regards,
                            <br />
                            Fossorial
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default SendInviteLink;
