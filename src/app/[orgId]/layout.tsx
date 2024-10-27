import { Metadata } from "next";
import { TopbarNav } from "./components/TopbarNav";
import { Cog, Combine, LayoutGrid, Tent, Users, Waypoints } from "lucide-react";
import Header from "./components/Header";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";
import { cache } from "react";
import { internal } from "@app/api";
import { AxiosResponse } from "axios";
import { GetOrgResponse, ListOrgsResponse } from "@server/routers/org";
import { authCookieHeader } from "@app/api/cookies";

export const metadata: Metadata = {
    title: `Configuration - Pangolin`,
    description: "",
};

const topNavItems = [
    {
        title: "Sites",
        href: "/{orgId}/sites",
        icon: <Combine className="h-5 w-5" />,
    },
    {
        title: "Resources",
        href: "/{orgId}/resources",
        icon: <Waypoints className="h-5 w-5" />,
    },
    {
        title: "Users",
        href: "/{orgId}/users",
        icon: <Users className="h-5 w-5" />,
    },
    {
        title: "General",
        href: "/{orgId}/general",
        icon: <Cog className="h-5 w-5" />,
    },
];

interface ConfigurationLaytoutProps {
    children: React.ReactNode;
    params: Promise<{ orgId: string }>;
}

export default async function ConfigurationLaytout(
    props: ConfigurationLaytoutProps
) {
    const params = await props.params;

    const { children } = props;

    const user = await verifySession();

    if (!user) {
        redirect("/auth/login");
    }

    const cookie = await authCookieHeader();

    try {
        await internal.get<AxiosResponse<GetOrgResponse>>(
            `/org/${params.orgId}`,
            cookie
        );
    } catch {
        redirect(`/`);
    }

    let orgs: ListOrgsResponse["orgs"] = [];
    try {
        const res = await internal.get<AxiosResponse<ListOrgsResponse>>(
            `/orgs`,
            cookie
        );
        if (res && res.data.data.orgs) {
            orgs = res.data.data.orgs;
        }
    } catch (e) {
        console.error("Error fetching orgs", e);
    }

    return (
        <>
            <div className="w-full bg-muted mb-6 select-none sm:px-0 px-3 pt-3">
                <div className="container mx-auto flex flex-col content-between gap-4 ">
                    <Header
                        email={user.email}
                        orgName={params.orgId}
                        orgs={orgs}
                    />
                    <TopbarNav items={topNavItems} orgId={params.orgId} />
                </div>
            </div>

            <div className="container mx-auto sm:px-0 px-3">{children}</div>
        </>
    );
}
