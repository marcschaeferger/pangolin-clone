import { Metadata } from "next";
import { TopbarNav } from "@app/components/TopbarNav";
import { Users } from "lucide-react";
import { Header } from "@app/components/Header";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";
import { cache } from "react";
import UserProvider from "@app/providers/UserProvider";
import { ListOrgsResponse } from "@server/routers/org";
import { internal } from "@app/lib/api";
import { AxiosResponse } from "axios";
import { authCookieHeader } from "@app/lib/api/cookies";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: `Server Admin - Pangolin`,
    description: ""
};

const topNavItems = [
    {
        title: "All Users",
        href: "/admin/users",
        icon: <Users className="h-4 w-4" />
    }
];

interface LayoutProps {
    children: React.ReactNode;
}

export default async function SettingsLayout(props: LayoutProps) {
    const getUser = cache(verifySession);
    const user = await getUser();

    if (!user || !user.serverAdmin) {
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
    } catch (e) {}

    return (
        <>
            <div className="w-full bg-card sm:px-0 fixed top-0 z-10 border-b">
                <div className="container mx-auto flex flex-col content-between">
                    <div className="my-4 px-3 md:px-0">
                        <UserProvider user={user}>
                            <Header orgId={""} orgs={orgs} />
                        </UserProvider>
                    </div>
                    <TopbarNav items={topNavItems} />
                </div>
            </div>

            <div className="container mx-auto sm:px-0 px-3 pt-[155px]">
                {props.children}
            </div>
        </>
    );
}
