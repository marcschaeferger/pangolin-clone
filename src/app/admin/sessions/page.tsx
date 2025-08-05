import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import { AxiosResponse } from "axios";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Monitor, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import { GetSessionStatsResponse } from "@server/routers/session/getSessionStats";

type SessionStats = {
    totalUserSessions: number;
    totalResourceSessions: number;
    userSessionsExpiringSoon: number;
    resourceSessionsExpiringSoon: number;
};

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
    let stats: SessionStats = {
        totalUserSessions: 0,
        totalResourceSessions: 0,
        userSessionsExpiringSoon: 0,
        resourceSessionsExpiringSoon: 0,
    };

    try {
        const res = await internal.get<AxiosResponse<GetSessionStatsResponse>>(
            `/sessions/stats`,
            await authCookieHeader()
        );
        stats = res.data.data.stats;
    } catch (e) {
        console.error(e);
    }

    const t = await getTranslations();

    return (
        <>
            <SettingsSectionTitle
                title="Session Management"
                description="View and manage active user and resource sessions"
            />
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active User Sessions
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUserSessions}</div>
                        <p className="text-xs text-muted-foreground">
                            Dashboard and API sessions
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Resource Sessions
                        </CardTitle>
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalResourceSessions}</div>
                        <p className="text-xs text-muted-foreground">
                            Resource access sessions
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            User Sessions Expiring Soon
                        </CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.userSessionsExpiringSoon}</div>
                        <p className="text-xs text-muted-foreground">
                            Expiring within 1 hour
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Resource Sessions Expiring Soon
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.resourceSessionsExpiringSoon}</div>
                        <p className="text-xs text-muted-foreground">
                            Expiring within 1 hour
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>User Sessions</CardTitle>
                        <CardDescription>
                            Manage active user dashboard and API sessions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            View all active user sessions, see who is logged in, and invalidate sessions as needed.
                        </p>
                        <Link href="/admin/sessions/user-sessions">
                            <Button>Manage User Sessions</Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Resource Sessions</CardTitle>
                        <CardDescription>
                            Manage active resource access sessions
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            View all active resource sessions, see which resources are being accessed, and invalidate sessions as needed.
                        </p>
                        <Link href="/admin/sessions/resource-sessions">
                            <Button>Manage Resource Sessions</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}