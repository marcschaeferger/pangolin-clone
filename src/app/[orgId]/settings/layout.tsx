import { Metadata } from "next";
import { TopbarNav } from "./components/TopbarNav";
import { Cog, Combine, Settings, Users, Waypoints } from "lucide-react";
import Header from "./components/Header";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";
import { internal } from "@app/api";
import { AxiosResponse } from "axios";
import { GetOrgResponse, ListOrgsResponse } from "@server/routers/org";
import { authCookieHeader } from "@app/api/cookies";
import { cache } from "react";
import { GetOrgUserResponse } from "@server/routers/user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: `Settings - Pangolin`,
    description: "",
};

const topNavItems = [
    {
        title: "Sites",
        href: "/{orgId}/settings/sites",
        icon: <Combine className="h-4 w-4" />,
    },
    {
        title: "Resources",
        href: "/{orgId}/settings/resources",
        icon: <Waypoints className="h-4 w-4" />,
    },
    {
        title: "Access",
        href: "/{orgId}/settings/access",
        icon: <Users className="h-4 w-4" />,
    },
    {
        title: "General",
        href: "/{orgId}/settings/general",
        icon: <Settings className="h-4 w-4" />,
    },
];

interface SettingsLayoutProps {
    children: React.ReactNode;
    params: Promise<{ orgId: string }>;
}

export default async function SettingsLayout(props: SettingsLayoutProps) {
    const params = await props.params;

    const { children } = props;

    const getUser = cache(verifySession);
    const user = await getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const cookie = await authCookieHeader();

    try {
        const getOrgUser = cache(() =>
            internal.get<AxiosResponse<GetOrgUserResponse>>(
                `/org/${params.orgId}/user/${user.userId}`,
                cookie
            )
        );
        const orgUser = await getOrgUser();

        if (!orgUser.data.data.isAdmin && !orgUser.data.data.isOwner) {
            throw new Error("User is not an admin or owner");
        }
    } catch {
        redirect(`/${params.orgId}`);
    }

    let orgs: ListOrgsResponse["orgs"] = [];
    try {
        const getOrgs = cache(() =>
            internal.get<AxiosResponse<ListOrgsResponse>>(`/orgs`, cookie)
        );
        const res = await getOrgs();
        if (res && res.data.data.orgs) {
            orgs = res.data.data.orgs;
        }
    } catch (e) {
        console.error("Error fetching orgs", e);
    }

    return (
        <>
            <div className="w-full border-b bg-neutral-100 dark:bg-neutral-900 mb-6 select-none sm:px-0 px-3 pt-3">
                <div className="container mx-auto flex flex-col content-between gap-4 ">
                    <Header
                        email={user.email}
                        orgId={params.orgId}
                        orgs={orgs}
                    />
                    <TopbarNav items={topNavItems} orgId={params.orgId} />
                </div>
            </div>

            <div className="container mx-auto sm:px-0 px-3">{children}</div>
        </>
    );
}
