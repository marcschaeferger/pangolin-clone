import { Metadata } from "next";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";
import { cache } from "react";
import Header from "@app/components/Header";
import { internal } from "@app/api";
import { AxiosResponse } from "axios";
import { ListOrgsResponse } from "@server/routers/org";
import { authCookieHeader } from "@app/api/cookies";
import { TopbarNav } from "@app/components/TopbarNav";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: `User Settings - Pangolin`,
    description: ""
};

const topNavItems = [
    {
        title: "User Settings",
        href: "/profile/general",
        icon: <Settings className="h-4 w-4" />
    }
];

interface SettingsLayoutProps {
    children: React.ReactNode;
    params: Promise<{}>;
}

export default async function SettingsLayout(props: SettingsLayoutProps) {
    const { children } = props;

    const getUser = cache(verifySession);
    const user = await getUser();

    if (!user) {
        redirect(`/`);
    }

    const cookie = await authCookieHeader();

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
                        <Header email={user.email} orgs={orgs} />
                    </div>
                    <TopbarNav items={topNavItems} />
                </div>
            </div>

            <div className="container mx-auto sm:px-0 px-3 pt-[165px]">
                {children}
            </div>
        </>
    );
}
