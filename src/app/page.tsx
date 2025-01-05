import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import ProfileIcon from "@app/components/ProfileIcon";
import { verifySession } from "@app/lib/auth/verifySession";
import UserProvider from "@app/providers/UserProvider";
import { ListOrgsResponse } from "@server/routers/org";
import { AxiosResponse } from "axios";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache } from "react";
import OrganizationLanding from "./components/OrganizationLanding";
import { pullEnv } from "@app/lib/pullEnv";

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
            redirect(`/auth/login?redirect=${params.redirect}`);
        } else {
            redirect(`/auth/login`);
        }
    }

    if (
        !user.emailVerified &&
        env.flags.emailVerificationRequired
    ) {
        if (params.redirect) {
            redirect(`/auth/verify-email?redirect=${params.redirect}`);
        } else {
            redirect(`/auth/verify-email`);
        }
    }

    let orgs: ListOrgsResponse["orgs"] = [];
    try {
        const res = await internal.get<AxiosResponse<ListOrgsResponse>>(
            `/orgs`,
            await authCookieHeader()
        );

        if (res && res.data.data.orgs) {
            orgs = res.data.data.orgs;
        }
    } catch (e) {}

    if (!orgs.length) {
        if (
            !env.flags.disableUserCreateOrg ||
            user.serverAdmin
        ) {
            redirect("/setup");
        }
    }

    return (
        <>
            <div className="p-3">
                {user && (
                    <UserProvider user={user}>
                        <div>
                            <ProfileIcon />
                        </div>
                    </UserProvider>
                )}

                <div className="w-full max-w-md mx-auto md:mt-32 mt-4">
                    <OrganizationLanding
                        organizations={orgs.map((org) => ({
                            name: org.name,
                            id: org.orgId
                        }))}
                    />
                </div>
            </div>
        </>
    );
}
