import { verifySession } from "@app/lib/auth/verifySession";
import UserProvider from "@app/providers/UserProvider";
import { cache } from "react";
import OrganizationLandingCard from "./OrganizationLandingCard";
import { GetOrgOverviewResponse } from "@server/routers/org/getOrgOverview";
import { internal } from "@app/lib/api";
import { AxiosResponse } from "axios";
import { authCookieHeader } from "@app/lib/api/cookies";
import { redirect } from "next/navigation";
import { Layout } from "@app/components/Layout";
import { orgLangingNavItems, orgNavItems, rootNavItems } from "../navigation";
import { ListUserOrgsResponse } from "@server/routers/org";

type OrgPageProps = {
    params: Promise<{ orgId: string }>;
};

export default async function OrgPage(props: OrgPageProps) {
    const params = await props.params;
    const orgId = params.orgId;

    const getUser = cache(verifySession);
    const user = await getUser();

    if (!user) {
        redirect("/");
    }

    let redirectToSettings = false;
    let overview: GetOrgOverviewResponse | undefined;
    try {
        const res = await internal.get<AxiosResponse<GetOrgOverviewResponse>>(
            `/org/${orgId}/overview`,
            await authCookieHeader()
        );
        overview = res.data.data;

        if (overview.isAdmin || overview.isOwner) {
            redirectToSettings = true;
        }
    } catch (e) {}

    if (redirectToSettings) {
        redirect(`/${orgId}/settings`);
    }

    let orgs: ListUserOrgsResponse["orgs"] = [];
    try {
        const getOrgs = cache(async () =>
            internal.get<AxiosResponse<ListUserOrgsResponse>>(
                `/user/${user.userId}/orgs`,
                await authCookieHeader()
            )
        );
        const res = await getOrgs();
        if (res && res.data.data.orgs) {
            orgs = res.data.data.orgs;
        }
    } catch (e) {}

    return (
        <UserProvider user={user}>
            <Layout orgId={orgId} navItems={orgLangingNavItems} orgs={orgs}>
                {overview && (
                    <div className="w-full max-w-4xl mx-auto md:mt-32 mt-4">
                        <OrganizationLandingCard
                            overview={{
                                orgId: overview.orgId,
                                orgName: overview.orgName,
                                stats: {
                                    users: overview.numUsers,
                                    sites: overview.numSites,
                                    resources: overview.numResources
                                },
                                isAdmin: overview.isAdmin,
                                isOwner: overview.isOwner,
                                userRole: overview.userRoleName
                            }}
                        />
                    </div>
                )}
            </Layout>
        </UserProvider>
    );
}
