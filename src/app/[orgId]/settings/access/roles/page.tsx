import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import { AxiosResponse } from "axios";
import { GetOrgResponse } from "@server/routers/org";
import { cache } from "react";
import OrgProvider from "@app/providers/OrgProvider";
import { ListRolesResponse } from "@server/routers/role";
import RolesTable, { RoleRow } from "./RolesTable";
import { SidebarSettings } from "@app/components/SidebarSettings";
import AccessPageHeaderAndNav from "../AccessPageHeaderAndNav";

type RolesPageProps = {
    params: Promise<{ orgId: string }>;
};

export const dynamic = "force-dynamic";

export default async function RolesPage(props: RolesPageProps) {
    const params = await props.params;

    let roles: ListRolesResponse["roles"] = [];
    const res = await internal
        .get<
            AxiosResponse<ListRolesResponse>
        >(`/org/${params.orgId}/roles`, await authCookieHeader())
        .catch((e) => {});

    if (res && res.status === 200) {
        roles = res.data.data.roles;
    }

    let org: GetOrgResponse | null = null;
    const getOrg = cache(async () =>
        internal
            .get<
                AxiosResponse<GetOrgResponse>
            >(`/org/${params.orgId}`, await authCookieHeader())
            .catch((e) => {})
    );
    const orgRes = await getOrg();

    if (orgRes && orgRes.status === 200) {
        org = orgRes.data.data;
    }

    const roleRows: RoleRow[] = roles;

    return (
        <>
            <AccessPageHeaderAndNav>
                <OrgProvider org={org}>
                    <RolesTable roles={roleRows} />
                </OrgProvider>
            </AccessPageHeaderAndNav>
        </>
    );
}
