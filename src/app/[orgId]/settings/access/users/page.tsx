import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import { ListUsersResponse } from "@server/routers/user";
import { AxiosResponse } from "axios";
import UsersTable, { UserRow } from "./UsersTable";
import { GetOrgResponse } from "@server/routers/org";
import { cache } from "react";
import OrgProvider from "@app/providers/OrgProvider";
import UserProvider from "@app/providers/UserProvider";
import { verifySession } from "@app/lib/auth/verifySession";
import AccessPageHeaderAndNav from "../AccessPageHeaderAndNav";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";

type UsersPageProps = {
    params: Promise<{ orgId: string }>;
};

export const dynamic = "force-dynamic";

export default async function UsersPage(props: UsersPageProps) {
    const params = await props.params;

    const getUser = cache(verifySession);
    const user = await getUser();

    let users: ListUsersResponse["users"] = [];
    let hasInvitations = false;

    const res = await internal
        .get<
            AxiosResponse<ListUsersResponse>
        >(`/org/${params.orgId}/users`, await authCookieHeader())
        .catch((e) => {});

    if (res && res.status === 200) {
        users = res.data.data.users;
    }

    const invitationsRes = await internal
        .get<
            AxiosResponse<{
                pagination: { total: number };
            }>
        >(
            `/org/${params.orgId}/invitations?limit=1&offset=0`,
            await authCookieHeader()
        )
        .catch((e) => {});

    if (invitationsRes && invitationsRes.status === 200) {
        hasInvitations = invitationsRes.data.data.pagination.total > 0;
    }

    let org: GetOrgResponse | null = null;
    const getOrg = cache(async () =>
        internal
            .get<
                AxiosResponse<GetOrgResponse>
            >(`/org/${params.orgId}`, await authCookieHeader())
            .catch((e) => {
                console.error(e);
            })
    );
    const orgRes = await getOrg();

    if (orgRes && orgRes.status === 200) {
        org = orgRes.data.data;
    }

    const userRows: UserRow[] = users.map((user) => {
        return {
            id: user.id,
            username: user.username,
            displayUsername: user.email || user.name || user.username,
            name: user.name,
            email: user.email,
            type: user.type,
            idpId: user.idpId,
            idpName: user.idpName || "Internal",
            status: "Confirmed",
            role: user.isOwner ? "Owner" : user.roleName || "Member",
            isOwner: user.isOwner || false
        };
    });

    return (
        <>
            <SettingsSectionTitle
                title="Manage Users"
                description="Invite users and add them to roles to manage access to your organization"
            />
            <UserProvider user={user!}>
                <OrgProvider org={org}>
                    <UsersTable users={userRows} />
                </OrgProvider>
            </UserProvider>
        </>
    );
}
