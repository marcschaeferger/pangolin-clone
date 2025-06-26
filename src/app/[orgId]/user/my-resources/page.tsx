import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import { AxiosResponse } from "axios";
import { ListResourcesResponse } from "@server/routers/resource";
import { redirect } from "next/navigation";
import { cache } from "react";
import { GetOrgResponse, ListUserOrgsResponse } from "@server/routers/org";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Waypoints, ExternalLink, Shield, ShieldOff, Globe } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { verifySession } from "@app/lib/auth/verifySession";
import UserProvider from "@app/providers/UserProvider";
import { Layout } from "@app/components/Layout";
import { orgMemberNavItems } from "@app/app/navigation";

type MyResourcesPageProps = {
    params: Promise<{ orgId: string }>;
};

export default async function MyResourcesPage(props: MyResourcesPageProps) {
    const params = await props.params;
    const t = await getTranslations();

    const getUser = cache(verifySession);
    const user = await getUser();

    if (!user) {
        redirect("/");
    }

    let resources: ListResourcesResponse["resources"] = [];
    let org = null;
    let orgs: ListUserOrgsResponse["orgs"] = [];

    try {
        // Get organization details
        const getOrg = cache(async () =>
            internal.get<AxiosResponse<GetOrgResponse>>(
                `/org/${params.orgId}`,
                await authCookieHeader()
            )
        );
        const orgRes = await getOrg();
        org = orgRes.data.data;

        // Get user's assigned resources
        const res = await internal.get<AxiosResponse<ListResourcesResponse>>(
            `/org/${params.orgId}/resources`,
            await authCookieHeader()
        );
        resources = res.data.data.resources;

        // Get user's organizations for the layout
        const getOrgs = cache(async () =>
            internal.get<AxiosResponse<ListUserOrgsResponse>>(
                `/user/${user.userId}/orgs`,
                await authCookieHeader()
            )
        );
        const orgsRes = await getOrgs();
        if (orgsRes && orgsRes.data.data.orgs) {
            orgs = orgsRes.data.data.orgs;
        }
    } catch (e) {
        // If there's an error fetching resources or user doesn't have access, redirect to main page
        redirect(`/${params.orgId}`);
    }

    if (!org) {
        redirect(`/${params.orgId}`);
    }

    return (
        <UserProvider user={user}>
            <Layout orgId={params.orgId} navItems={orgMemberNavItems} orgs={orgs}>
                <div className="space-y-6">
                    <div className="flex items-center space-x-3">
                        <Waypoints className="h-8 w-8 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold">{t('myResources')}</h1>
                            <p className="text-muted-foreground">
                                {t('myResourcesDescription')}
                            </p>
                        </div>
                    </div>

                    {resources.length === 0 ? (
                        <Card>
                            <CardContent className="py-12">
                                <div className="text-center space-y-4">
                                    <Waypoints className="h-16 w-16 text-muted-foreground mx-auto" />
                                    <div>
                                        <h3 className="text-lg font-semibold">{t('noResourcesAssigned')}</h3>
                                        <p className="text-muted-foreground">
                                            {t('noResourcesAssignedDescription')}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {resources.map((resource) => (
                                <Card key={resource.resourceId} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <CardTitle className="text-lg">
                                                    {resource.name}
                                                </CardTitle>
                                                {resource.siteName && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {resource.siteName}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="space-y-2">
                                            {resource.http ? (
                                                <div className="flex items-center space-x-2 text-sm">
                                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">{t('siteUrl')}:</span>
                                                    {resource.enabled ? (
                                                        <Link 
                                                            href={`${resource.ssl ? "https://" : "http://"}${resource.fullDomain}`}
                                                            target="_blank"
                                                            className="text-blue-600 hover:underline"
                                                        >
                                                            {resource.fullDomain}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-gray-400 line-through">
                                                            {resource.fullDomain}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-2 text-sm">
                                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">{t('port')}:</span>
                                                    <span className={`font-mono ${resource.enabled ? '' : 'text-gray-400 line-through'}`}>
                                                        {resource.proxyPort}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center space-x-2 text-sm">
                                                {!resource.enabled ? (
                                                    <>
                                                        <ShieldOff className="h-4 w-4 text-gray-400" />
                                                        <span className="text-gray-500">{t('disabled')}</span>
                                                    </>
                                                ) : resource.http && (resource.sso || resource.pincodeId !== null || resource.passwordId !== null || resource.whitelist) ? (
                                                    <>
                                                        <Shield className="h-4 w-4 text-green-500" />
                                                        <span className="text-green-600">{t('enabled')} & {t('protected')}</span>
                                                    </>
                                                ) : resource.http ? (
                                                    <>
                                                        <ShieldOff className="h-4 w-4 text-orange-500" />
                                                        <span className="text-orange-600">{t('enabled')} & {t('notProtected')}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Shield className="h-4 w-4 text-blue-500" />
                                                        <span className="text-blue-600">{t('enabled')}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {resource.http && resource.enabled && (
                                            <Link 
                                                href={`${resource.ssl ? "https://" : "http://"}${resource.fullDomain}`}
                                                target="_blank"
                                                className="w-full"
                                            >
                                                <Button
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="w-full"
                                                >
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    {t('openResource')}
                                                </Button>
                                            </Link>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </Layout>
        </UserProvider>
    );
} 