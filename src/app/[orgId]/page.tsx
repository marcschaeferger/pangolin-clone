import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import { verifySession } from "@app/lib/auth/verifySession";
import { GetOrgUserResponse } from "@server/routers/user";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { cache } from "react";

type OrgPageProps = {
    params: Promise<{ orgId: string }>;
};

export default async function OrgPage(props: OrgPageProps) {
    const params = await props.params;
    const orgId = params.orgId;

    const getUser = cache(verifySession);
    const user = await getUser();

    if (!user) {
        redirect("/auth/login");
    }

    const cookie = await authCookieHeader();

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

    return (
        <>
            <p>Welcome to {orgId} dashboard</p>
        </>
    );
}
