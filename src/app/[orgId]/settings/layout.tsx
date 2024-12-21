import { Metadata } from "next";
import { TopbarNav } from "./components/TopbarNav";
import { Cog, Combine, Link, Settings, Users, Waypoints } from "lucide-react";
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
        title: "Sharable Links",
        href: "/{orgId}/settings/share-links",
        icon: <Link className="h-4 w-4" />
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
        redirect(`/?redirect=/${params.orgId}/`);
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
            <div className="w-full border-b bg-neutral-100 dark:bg-neutral-800 select-none sm:px-0 px-3 fixed top-0 z-10">
                <div className="container mx-auto flex flex-col content-between">
                    <div className="my-4">
                        <Header
                            email={user.email}
                            orgId={params.orgId}
                            orgs={orgs}
                        />
                    </div>
                    <TopbarNav items={topNavItems} orgId={params.orgId} />
                </div>
            </div>

            <div className="container mx-auto sm:px-0 px-3 pt-[165px]">{children}</div>

            <footer className="w-full mt-6 py-3">
                <div className="container mx-auto flex justify-end items-center px-3 sm:px-0 text-sm text-neutral-300 dark:text-neutral-700 space-x-3 select-none">
                    <div>Built by Fossorial</div>
                    <a
                        href="https://github.com/fosrl/pangolin"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-4 h-4"
                        >
                            <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.207 11.385.6.11.82-.26.82-.577v-2.17c-3.338.726-4.042-1.61-4.042-1.61-.546-1.385-1.333-1.755-1.333-1.755-1.09-.744.082-.73.082-.73 1.205.085 1.84 1.24 1.84 1.24 1.07 1.835 2.807 1.305 3.492.997.107-.775.42-1.305.763-1.605-2.665-.305-5.467-1.335-5.467-5.93 0-1.31.468-2.382 1.236-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.52 11.52 0 013.006-.403c1.02.005 2.045.137 3.006.403 2.29-1.552 3.295-1.23 3.295-1.23.654 1.653.242 2.873.12 3.176.77.838 1.235 1.91 1.235 3.22 0 4.605-2.805 5.623-5.475 5.92.43.37.814 1.1.814 2.22v3.293c0 .32.217.693.825.576C20.565 21.795 24 17.298 24 12 24 5.373 18.627 0 12 0z" />
                        </svg>
                    </a>
                </div>
            </footer>
        </>
    );
}
