import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import { AxiosResponse } from "axios";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { AdminListUsersResponse } from "@server/routers/user/adminListUsers";
import UsersTable, { GlobalUserRow } from "./AdminUsersTable";

type PageProps = {
    params: Promise<{ orgId: string }>;
};

export const dynamic = "force-dynamic";

export default async function UsersPage(props: PageProps) {
    let rows: AdminListUsersResponse["users"] = [];
    try {
        const res = await internal.get<AxiosResponse<AdminListUsersResponse>>(
            `/users`,
            await authCookieHeader()
        );
        rows = res.data.data.users;
    } catch (e) {
        console.error(e);
    }

    const userRows: GlobalUserRow[] = rows.map((row) => {
        return {
            id: row.id,
            email: row.email,
            name: row.name,
            username: row.username,
            type: row.type,
            idpId: row.idpId,
            idpName: row.idpName || "Internal",
            dateCreated: row.dateCreated,
            serverAdmin: row.serverAdmin
        };
    });

    return (
        <>
            <SettingsSectionTitle
                title="Manage All Users"
                description="View and manage all users in the system"
            />
            <UsersTable users={userRows} />
        </>
    );
}
