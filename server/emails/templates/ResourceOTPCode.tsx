import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Tailwind
} from "@react-email/components";
import * as React from "react";

interface ResourceOTPCodeProps {
    email?: string;
    resourceName: string;
    orgName: string;
    otp: string;
}

export const ResourceOTPCode = ({
    email,
    resourceName,
    orgName: organizationName,
    otp
}: ResourceOTPCodeProps) => {
    const previewText = `Your one-time password for ${resourceName} is ready!`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind
                config={{
                    theme: {
                        extend: {
                            colors: {
                                primary: "#F97317"
                            }
                        }
                    }
                }}
            >
                <Body className="font-sans">
                    <Container className="bg-white border border-solid border-gray-200 p-6 max-w-lg mx-auto my-8 rounded-lg">
                        <Heading className="text-2xl font-semibold text-gray-800 text-center">
                            Your One-Time Password
                        </Heading>
                        <Text className="text-base text-gray-700 mt-4">
                            Hi {email || "there"},
                        </Text>
                        <Text className="text-base text-gray-700 mt-2">
                            You’ve requested a one-time password (OTP) to
                            authenticate with the resource{" "}
                            <strong>{resourceName}</strong> in{" "}
                            <strong>{organizationName}</strong>. Use the OTP
                            below to complete your authentication:
                        </Text>
                        <Section className="text-center my-6">
                            <Text className="inline-block bg-primary text-xl font-bold text-white py-2 px-4 border border-gray-300 rounded-xl">
                                {otp}
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default ResourceOTPCode;
