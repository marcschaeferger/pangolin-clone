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
            email: user.email,
            status: "Confirmed",
            role: user.isOwner ? "Owner" : user.roleName || "Member",
            isOwner: user.isOwner || false
        };
    });

    return (
        <>
            <AccessPageHeaderAndNav hasInvitations={hasInvitations}>
                <UserProvider user={user!}>
                    <OrgProvider org={org}>
                        <UsersTable users={userRows} />
                    </OrgProvider>
                </UserProvider>
            </AccessPageHeaderAndNav>
        </>
    );
}
