import { verifySession } from "@app/lib/auth/verifySession";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";

export const metadata: Metadata = {
    title: `Setup - Pangolin`,
    description: "",
};

export default async function SetupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const getUser = cache(verifySession);
    const user = await getUser();

    if (!user) {
        redirect("/");
    }

    return <div className="mt-32">{children}</div>;
}
