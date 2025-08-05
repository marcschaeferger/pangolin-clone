import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import { AxiosResponse } from "axios";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import UserSessionsTable, { UserSessionRow } from "../UserSessionsTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ListUserSessionsResponse } from "@server/routers/session/listUserSessions";

export const dynamic = "force-dynamic";

export default async function UserSessionsPage() {
    let sessions: UserSessionRow[] = [];
    
    try {
        const res = await internal.get<AxiosResponse<ListUserSessionsResponse>>(
            `/sessions/users`,
            await authCookieHeader()
        );
        sessions = res.data.data.sessions;
    } catch (e) {
        console.error(e);
    }

    const t = await getTranslations();

    return (
        <>
            <SettingsSectionTitle
                title="User Sessions"
                description="Manage active user dashboard and API sessions"
            />
            
            <Alert variant="neutral" className="mb-6">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle className="font-semibold">About User Sessions</AlertTitle>
                <AlertDescription>
                    User sessions represent active login sessions for users accessing the dashboard
                    or API. When you invalidate a session, the user will be immediately logged out
                    and will need to sign in again. Use caution when invalidating your own session.
                </AlertDescription>
            </Alert>
            
            <UserSessionsTable sessions={sessions} />
        </>
    );
}