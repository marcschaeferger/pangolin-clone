import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import { AxiosResponse } from "axios";
import InvitationsTable, { InvitationRow } from "./InvitationsTable";
import { GetOrgResponse } from "@server/routers/org";
import { cache } from "react";
import OrgProvider from "@app/providers/OrgProvider";
import UserProvider from "@app/providers/UserProvider";
import { verifySession } from "@app/lib/auth/verifySession";
import AccessPageHeaderAndNav from "../AccessPageHeaderAndNav";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";

type InvitationsPageProps = {
    params: Promise<{ orgId: string }>;
};

export const dynamic = "force-dynamic";

export default async function InvitationsPage(props: InvitationsPageProps) {
    const params = await props.params;

    const getUser = cache(verifySession);
    const user = await getUser();

    let invitations: {
        inviteId: string;
        email: string;
        expiresAt: string;
        roleId: number;
        roleName?: string;
    }[] = [];
    let hasInvitations = false;

    const res = await internal
        .get<
            AxiosResponse<{
                invitations: typeof invitations;
                pagination: { total: number };
            }>
        >(`/org/${params.orgId}/invitations`, await authCookieHeader())
        .catch((e) => {});

    if (res && res.status === 200) {
        invitations = res.data.data.invitations;
        hasInvitations = res.data.data.pagination.total > 0;
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

    const invitationRows: InvitationRow[] = invitations.map((invite) => {
        return {
            id: invite.inviteId,
            email: invite.email,
            expiresAt: new Date(Number(invite.expiresAt)).toISOString(),
            role: invite.roleName || "Unknown Role",
            roleId: invite.roleId
        };
    });

    return (
        <>
            <SettingsSectionTitle
                title="Open Invitations"
                description="Manage your invitations to other users"
            />
            <UserProvider user={user!}>
                <OrgProvider org={org}>
                    <InvitationsTable invitations={invitationRows} />
                </OrgProvider>
            </UserProvider>
        </>
    );
}
