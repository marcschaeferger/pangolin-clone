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
import LetterHead from "./components/LetterHead";

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
    const previewText = `Your one-time password for ${resourceName} is ${otp}`;

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
                        <LetterHead />

                        <Heading className="text-2xl font-semibold text-gray-800 text-center">
                            Your One-Time Password for {resourceName}
                        </Heading>
                        <Text className="text-base text-gray-700 mt-4">
                            Hi {email || "there"},
                        </Text>
                        <Text className="text-base text-gray-700 mt-2">
                            You’ve requested a one-time password to access{" "}
                            <strong>{resourceName}</strong> in{" "}
                            <strong>{organizationName}</strong>. Use the code
                            below to complete your authentication:
                        </Text>
                        <Section className="text-center">
                            <Text className="inline-block bg-primary text-xl font-bold text-white py-2 px-4 border border-gray-300 rounded-xl">
                                {otp}
                            </Text>
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

export default ResourceOTPCode;
