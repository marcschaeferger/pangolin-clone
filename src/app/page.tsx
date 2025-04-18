import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import { verifySession } from "@app/lib/auth/verifySession";
import UserProvider from "@app/providers/UserProvider";
import { ListUserOrgsResponse } from "@server/routers/org";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { cache } from "react";
import OrganizationLanding from "./components/OrganizationLanding";
import { pullEnv } from "@app/lib/pullEnv";
import { cleanRedirect } from "@app/lib/cleanRedirect";
import { Layout } from "@app/components/Layout";
import { rootNavItems } from "./navigation";

export const dynamic = "force-dynamic";

export default async function Page(props: {
    searchParams: Promise<{
        redirect: string | undefined;
        t: string | undefined;
    }>;
}) {
    const params = await props.searchParams; // this is needed to prevent static optimization

    const env = pullEnv();

    const getUser = cache(verifySession);
    const user = await getUser({ skipCheckVerifyEmail: true });

    if (!user) {
        if (params.redirect) {
            const safe = cleanRedirect(params.redirect);
            redirect(`/auth/login?redirect=${safe}`);
        } else {
            redirect(`/auth/login`);
        }
    }

    if (!user.emailVerified && env.flags.emailVerificationRequired) {
        if (params.redirect) {
            const safe = cleanRedirect(params.redirect);
            redirect(`/auth/verify-email?redirect=${safe}`);
        } else {
            redirect(`/auth/verify-email`);
        }
    }

    let orgs: ListUserOrgsResponse["orgs"] = [];
    try {
        const res = await internal.get<AxiosResponse<ListUserOrgsResponse>>(
            `/user/${user.userId}/orgs`,
            await authCookieHeader()
        );

        if (res && res.data.data.orgs) {
            orgs = res.data.data.orgs;
        }
    } catch (e) {}

    if (!orgs.length) {
        if (!env.flags.disableUserCreateOrg || user.serverAdmin) {
            redirect("/setup");
        }
    }

    return (
        <UserProvider user={user}>
            <Layout orgs={orgs} navItems={rootNavItems} showBreadcrumbs={false}>
                <div className="w-full max-w-md mx-auto md:mt-32 mt-4">
                    <OrganizationLanding
                        disableCreateOrg={
                            env.flags.disableUserCreateOrg && !user.serverAdmin
                        }
                        organizations={orgs.map((org) => ({
                            name: org.name,
                            id: org.orgId
                        }))}
                    />
                </div>
            </Layout>
        </UserProvider>
    );
}
