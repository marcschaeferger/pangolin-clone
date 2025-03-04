import { Metadata } from "next";
import { TopbarNav } from "@app/components/TopbarNav";
import {
    Cog,
    Combine,
    LinkIcon,
    Settings,
    Users,
    Waypoints
} from "lucide-react";
import { Header } from "@app/components/Header";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";
import { internal } from "@app/lib/api";
import { AxiosResponse } from "axios";
import { GetOrgResponse, ListOrgsResponse } from "@server/routers/org";
import { authCookieHeader } from "@app/lib/api/cookies";
import { cache } from "react";
import { GetOrgUserResponse } from "@server/routers/user";
import UserProvider from "@app/providers/UserProvider";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@app/components/ui/breadcrumb";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: `Settings - Pangolin`,
    description: ""
};

const topNavItems = [
    {
        title: "Sites",
        href: "/{orgId}/settings/sites",
        icon: <Combine className="h-4 w-4" />
    },
    {
        title: "Resources",
        href: "/{orgId}/settings/resources",
        icon: <Waypoints className="h-4 w-4" />
    },
    {
        title: "Users & Roles",
        href: "/{orgId}/settings/access",
        icon: <Users className="h-4 w-4" />
    },
    {
        title: "Shareable Links",
        href: "/{orgId}/settings/share-links",
        icon: <LinkIcon className="h-4 w-4" />
    },
    {
        title: "General",
        href: "/{orgId}/settings/general",
        icon: <Settings className="h-4 w-4" />
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
        <>
            <div className="w-full bg-card sm:px-0 px-3 fixed top-0 z-10">
                <div className="border-b">
                    <div className="container mx-auto flex flex-col content-between">
                        <div className="my-4">
                            <UserProvider user={user}>
                                <Header orgId={params.orgId} orgs={orgs} />
                            </UserProvider>
                        </div>
                        <TopbarNav items={topNavItems} orgId={params.orgId} />
                    </div>
                </div>
            </div>

            <div className="container mx-auto sm:px-0 px-3 pt-[155px]">
                <div className="container mx-auto sm:px-0 px-3">
                    {children}
                </div>
            </div>
        </>
    );
}
