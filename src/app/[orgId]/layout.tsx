import { Metadata } from "next";
import { TopbarNav } from "./components/TopbarNav";
import { Cog, Combine, LayoutGrid, Tent, Users, Waypoints } from "lucide-react";
import Header from "./components/Header";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Configuration",
    description: "",
};

const topNavItems = [
    {
        title: "Sites",
        href: "/{orgId}/sites",
        icon: <Combine />,
    },
    {
        title: "Resources",
        href: "/{orgId}/resources",
        icon: <Waypoints />,
    },
    {
        title: "Users",
        href: "/{orgId}/users",
        icon: <Users />,
    },
    {
        title: "General",
        href: "/{orgId}/general",
        icon: <Cog />,
    },
];

interface ConfigurationLaytoutProps {
    children: React.ReactNode;
    params: { orgId: string };
}

export default async function ConfigurationLaytout({
    children,
    params,
}: ConfigurationLaytoutProps) {
    const user = await verifySession();

    if (!user) {
        redirect("/auth/login");
    }

    return (
        <>
            <div className="w-full bg-neutral-100 border-b border-neutral-200 mb-6 select-none sm:px-0 px-3 pt-3">
                <div className="container mx-auto flex flex-col content-between gap-4">
                    <Header email={user.email} orgName={params.orgId} />
                    <TopbarNav items={topNavItems} orgId={params.orgId} />
                </div>
            </div>

            <div className="container mx-auto sm:px-0 px-3">{children}</div>
        </>
    );
}
