import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import ProfileIcon from "@app/components/ProfileIcon";
import { verifySession } from "@app/lib/auth/verifySession";
import UserProvider from "@app/providers/UserProvider";
import { GetOrgResponse } from "@server/routers/org";
import { GetOrgUserResponse } from "@server/routers/user";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { cache } from "react";

export default async function OrgLayout(props: {
    children: React.ReactNode;
    params: Promise<{ orgId: string }>;
}) {
    const cookie = await authCookieHeader();
    const params = await props.params;
    const orgId = params.orgId;

    if (!orgId) {
        redirect(`/`);
    }

    const getUser = cache(verifySession);
    const user = await getUser();

    if (!user) {
        redirect(`/?redirect=/${orgId}`);
    }

    try {
        const getOrgUser = cache(() =>
            internal.get<AxiosResponse<GetOrgUserResponse>>(
                `/org/${orgId}/user/${user.userId}`,
                cookie
            )
        );
        const orgUser = await getOrgUser();
    } catch {
        redirect(`/`);
    }

    try {
        const getOrg = cache(() =>
            internal.get<AxiosResponse<GetOrgResponse>>(`/org/${orgId}`, cookie)
        );
        await getOrg();
    } catch {
        redirect(`/`);
    }

    return (
        <>
            {props.children}
        </>
    );
}
