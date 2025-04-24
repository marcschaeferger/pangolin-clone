import { Metadata } from "next";
import { Users } from "lucide-react";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";
import { cache } from "react";
import UserProvider from "@app/providers/UserProvider";
import { ListUserOrgsResponse } from "@server/routers/org";
import { internal } from "@app/lib/api";
import { AxiosResponse } from "axios";
import { authCookieHeader } from "@app/lib/api/cookies";
import { Layout } from "@app/components/Layout";
import { adminNavItems } from "../navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: `Server Admin - Pangolin`,
    description: ""
};

interface LayoutProps {
    children: React.ReactNode;
}

export default async function AdminLayout(props: LayoutProps) {
    const getUser = cache(verifySession);
    const user = await getUser();

    if (!user || !user.serverAdmin) {
        redirect(`/`);
    }

    const cookie = await authCookieHeader();
    let orgs: ListUserOrgsResponse["orgs"] = [];
    try {
        const getOrgs = cache(() =>
            internal.get<AxiosResponse<ListUserOrgsResponse>>(
                `/user/${user.userId}/orgs`,
                cookie
            )
        );
        const res = await getOrgs();
        if (res && res.data.data.orgs) {
            orgs = res.data.data.orgs;
        }
    } catch (e) {}

    return (
        <UserProvider user={user}>
            <Layout orgs={orgs} navItems={adminNavItems}>
                {props.children}
            </Layout>
        </UserProvider>
    );
}
