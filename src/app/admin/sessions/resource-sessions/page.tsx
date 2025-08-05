import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import { AxiosResponse } from "axios";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import ResourceSessionsTable, { ResourceSessionRow } from "../ResourceSessionsTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ListResourceSessionsResponse } from "@server/routers/session/listResourceSessions";

export const dynamic = "force-dynamic";

export default async function ResourceSessionsPage() {
    let sessions: ResourceSessionRow[] = [];
    
    try {
        const res = await internal.get<AxiosResponse<ListResourceSessionsResponse>>(
            `/sessions/resources`,
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
                title="Resource Sessions"
                description="Manage active resource access sessions"
            />
            
            <Alert variant="neutral" className="mb-6">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle className="font-semibold">About Resource Sessions</AlertTitle>
                <AlertDescription>
                    Resource sessions represent active access sessions to resources (websites, applications, etc.).
                    These sessions are created when users authenticate to access protected resources. 
                    When you invalidate a resource session, the user will lose access to that resource immediately.
                </AlertDescription>
            </Alert>
            
            <ResourceSessionsTable sessions={sessions} />
        </>
    );
}