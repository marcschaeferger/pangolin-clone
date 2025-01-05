import { Container } from "@react-email/components";
import React from "react";

// EmailContainer: Wraps the entire email layout
export function EmailContainer({ children }: { children: React.ReactNode }) {
    return (
        <Container className="bg-white border border-solid border-gray-200 p-6 max-w-lg mx-auto my-8 rounded-lg">
            {children}
        </Container>
    );
}

// EmailLetterHead: For branding or logo at the top
export function EmailLetterHead() {
    return (
        <div className="mb-4">
            <table
                role="presentation"
                width="100%"
                style={{
                    marginBottom: "24px"
                }}
            >
                <tr>
                    <td
                        style={{
                            fontSize: "14px",
                            fontWeight: "bold",
                            color: "#F97317"
                        }}
                    >
                        Pangolin
                    </td>
                    <td
                        style={{
                            fontSize: "14px",
                            textAlign: "right",
                            color: "#6B7280"
                        }}
                    >
                        {new Date().getFullYear()}
                    </td>
                </tr>
            </table>
        </div>
    );
}

// EmailHeading: For the primary message or headline
export function EmailHeading({ children }: { children: React.ReactNode }) {
    return (
        <h1 className="text-2xl font-semibold text-gray-800 text-center">
            {children}
        </h1>
    );
}

export function EmailGreeting({ children }: { children: React.ReactNode }) {
    return <p className="text-lg text-gray-700 my-4">{children}</p>;
}

// EmailText: For general text content
export function EmailText({
    children,
    className
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <p className={`my-2 text-base text-gray-700 ${className}`}>
            {children}
        </p>
    );
}

// EmailSection: For visually distinct sections (like OTP)
export function EmailSection({
    children,
    className
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <div className={`text-center my-4 ${className}`}>{children}</div>;
}

// EmailFooter: For closing or signature
export function EmailFooter({ children }: { children: React.ReactNode }) {
    return <div className="text-sm text-gray-500 mt-6">{children}</div>;
}
