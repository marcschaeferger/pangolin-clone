import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import { AxiosResponse } from "axios";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { AdminListUsersResponse } from "@server/routers/user/adminListUsers";
import UsersTable, { GlobalUserRow } from "./AdminUsersTable";
import { Alert, AlertDescription, AlertTitle } from "@app/components/ui/alert";
import { InfoIcon } from "lucide-react";

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
            <Alert variant="neutral" className="mb-6">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle className="font-semibold">About User Management</AlertTitle>
                <AlertDescription>
                    This table displays all root user objects in the system. Each user may belong to multiple organizations. Removing a user from an organization does not delete their root user object - they will remain in the system. To completely remove a user from the system, you must delete their root user object using the delete action in this table.
                </AlertDescription>
            </Alert>
            <UsersTable users={userRows} />
        </>
    );
}
