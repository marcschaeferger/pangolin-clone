import { Metadata } from "next";

export const metadata: Metadata = {
    title: `Setup - Pangolin`,
    description: "",
};

export default async function SetupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="mt-32">{children}</div>;
}
