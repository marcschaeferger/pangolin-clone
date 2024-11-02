import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import { ListUsersResponse } from "@server/routers/user";
import { AxiosResponse } from "axios";
import UsersTable, { UserRow } from "./components/UsersTable";

type UsersPageProps = {
    params: Promise<{ orgId: string }>;
};

export default async function UsersPage(props: UsersPageProps) {
    const params = await props.params;
    let users: ListUsersResponse["users"] = [];
    try {
        const res = await internal.get<AxiosResponse<ListUsersResponse>>(
            `/org/${params.orgId}/users`,
            await authCookieHeader()
        );
        users = res.data.data.users;
    } catch (e) {
        console.error("Error fetching users", e);
    }

    const userRows: UserRow[] = users.map((user) => {
        return {
            id: user.id,
            email: user.email,
        };
    });

    return (
        <>
            <div className="space-y-0.5 select-none mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                    Manage Users
                </h2>
                <p className="text-muted-foreground">
                    Manage existing your users or invite new ones to your
                    organization.
                </p>
            </div>

            <UsersTable users={userRows} />
        </>
    );
}
