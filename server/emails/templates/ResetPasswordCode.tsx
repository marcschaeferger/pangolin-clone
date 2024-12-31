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
                            Password Reset Request
                        </Heading>
                        <Text className="text-base text-gray-700 mt-4">
                            Hi {email || "there"},
                        </Text>
                        <Text className="text-base text-gray-700 mt-2">
                            You’ve requested to reset your password. Please{" "}
                            <a href={link} className="text-primary">
                                click here
                            </a>{" "}
                            and follow the instructions to reset your password,
                            or manually enter the following code:
                        </Text>
                        <Section className="text-center">
                            <Text className="inline-block bg-primary text-xl font-bold text-white py-2 px-4 border border-gray-300 rounded-xl">
                                {code}
                            </Text>
                        </Section>
                        <Text className="text-base text-gray-700 mt-2">
                            If you didn’t request this, you can safely ignore
                            this email.
                        </Text>
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

export default ResetPasswordCode;
