import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import { GetOrgResponse } from "@server/routers/org";
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

    try {
        const getOrg = cache(() =>
            internal.get<AxiosResponse<GetOrgResponse>>(
                `/org/${orgId}`,
                cookie,
            ),
        );
        await getOrg();
    } catch {
        redirect(`/`);
    }

    return <>{props.children}</>;
}
