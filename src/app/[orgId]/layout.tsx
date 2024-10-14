import { Metadata } from "next";
import { TopbarNav } from "./components/TopbarNav";
import { Cog, LayoutGrid, Tent, Users } from "lucide-react";
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
        icon: <Tent />,
    },
    {
        title: "Resources",
        href: "/{orgId}/resources",
        icon: <LayoutGrid />,
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
            <div className="w-full bg-stone-200 border-b border-stone-300 mb-5 select-none sm:px-0 px-3">
                <div className="container mx-auto flex flex-col content-between gap-3 pt-2">
                    <Header
                        email={user.email}
                        orgName={params.orgId}
                    />
                    <TopbarNav items={topNavItems} orgId={params.orgId}/>
                </div>
            </div>

            <div className="container mx-auto sm:px-0 px-3">{children}</div>
        </>
    );
}
