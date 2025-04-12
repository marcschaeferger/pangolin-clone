import { Metadata } from "next";
import {
    Cog,
    Combine,
    LinkIcon,
    Settings,
    Users,
    Waypoints
} from "lucide-react";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";
import { internal } from "@app/lib/api";
import { AxiosResponse } from "axios";
import { GetOrgResponse, ListOrgsResponse } from "@server/routers/org";
import { authCookieHeader } from "@app/lib/api/cookies";
import { cache } from "react";
import { GetOrgUserResponse } from "@server/routers/user";
import UserProvider from "@app/providers/UserProvider";
import { Layout } from "@app/components/Layout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: `Settings - Pangolin`,
    description: ""
};

const navItems = [
    {
        title: "Sites",
        href: "/{orgId}/settings/sites",
        // icon: <Combine className="h-4 w-4" />
    },
    {
        title: "Resources",
        href: "/{orgId}/settings/resources",
        // icon: <Waypoints className="h-4 w-4" />
    },
    {
        title: "Access Control",
        href: "/{orgId}/settings/access",
        // icon: <Users className="h-4 w-4" />,
        children: [
            {
                title: "Users",
                href: "/{orgId}/settings/access/users"
            },
            {
                title: "Roles",
                href: "/{orgId}/settings/access/roles"
            }
        ]
    },
    {
        title: "Shareable Links",
        href: "/{orgId}/settings/share-links",
        // icon: <LinkIcon className="h-4 w-4" />
    },
    {
        title: "General",
        href: "/{orgId}/settings/general",
        // icon: <Settings className="h-4 w-4" />
    }
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
        redirect(`/`);
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
    } catch (e) {}

    return (
        <UserProvider user={user}>
            <Layout orgId={params.orgId} orgs={orgs} navItems={navItems}>
                {children}
            </Layout>
        </UserProvider>
    );
}
