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
            <Tailwind
                config={{
                    theme: {
                        extend: {
                            colors: {
                                primary: "#16A34A"
                            }
                        }
                    }
                }}
            >
                <Body className="font-sans">
                    <Container className="bg-white border border-solid border-gray-200 p-6 max-w-lg mx-auto my-8 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-bold text-orange-500">
                                Pangolin
                            </div>

                            <div className="text-sm text-gray-500">
                                {new Date().toLocaleDateString()}
                            </div>
                        </div>

                        <Heading className="text-2xl font-semibold text-gray-800 text-center">
                            Two-Factor Authentication{" "}
                            {enabled ? "Enabled" : "Disabled"}
                        </Heading>
                        <Text className="text-base text-gray-700 mt-4">
                            Hi {email || "there"},
                        </Text>
                        <Text className="text-base text-gray-700 mt-2">
                            This email confirms that Two-Factor Authentication
                            has been successfully{" "}
                            {enabled ? "enabled" : "disabled"} on your account.
                        </Text>
                        {enabled ? (
                            <Text className="text-base text-gray-700">
                                With Two-Factor Authentication enabled, your
                                account is now more secure. Please ensure you
                                keep your authentication method safe.
                            </Text>
                        ) : (
                            <Text className="text-base text-gray-700">
                                With Two-Factor Authentication disabled, your
                                account may be less secure. We recommend
                                enabling it to protect your account.
                            </Text>
                        )}
                        <Text className="text-base text-gray-700 mt-2">
                            If you did not make this change, please contact our
                            support team immediately.
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

export default TwoFactorAuthNotification;
