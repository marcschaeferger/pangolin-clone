import { Metadata } from "next";
import { TopbarNav } from "./components/TopbarNav";
import { Cog, Combine, LayoutGrid, Tent, Users, Waypoints } from "lucide-react";
import Header from "./components/Header";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";
import { cache } from "react";

export const metadata: Metadata = {
    title: "Configuration",
    description: "",
};

const topNavItems = [
    {
        title: "Sites",
        href: "/{orgId}/sites",
        icon: <Combine className="h-5 w-5"/>,
    },
    {
        title: "Resources",
        href: "/{orgId}/resources",
        icon: <Waypoints className="h-5 w-5"/>,
    },
    {
        title: "Users",
        href: "/{orgId}/users",
        icon: <Users className="h-5 w-5"/>,
    },
    {
        title: "General",
        href: "/{orgId}/general",
        icon: <Cog className="h-5 w-5"/>,
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
    const loadUser = cache(async () => await verifySession());

    const user = await loadUser();

    if (!user) {
        redirect("/auth/login");
    }

    return (
        <>
            <div className="w-full bg-muted mb-6 select-none sm:px-0 px-3 pt-3 border-b border-border">
                <div className="container mx-auto flex flex-col content-between gap-4 ">
                    <Header email={user.email} orgName={params.orgId} />
                    <TopbarNav items={topNavItems} orgId={params.orgId} />
                </div>
            </div>

            <div className="container mx-auto sm:px-0 px-3">{children}</div>
        </>
    );
}
