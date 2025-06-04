import ResourceProvider from "@app/providers/ResourceProvider";
import { internal } from "@app/lib/api";
import {
    GetResourceAuthInfoResponse,
    GetResourceResponse
} from "@server/routers/resource";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { authCookieHeader } from "@app/lib/api/cookies";
import { HorizontalTabs } from "@app/components/HorizontalTabs";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { GetOrgResponse } from "@server/routers/org";
import OrgProvider from "@app/providers/OrgProvider";
import { cache } from "react";
import ResourceInfoBox from "./ResourceInfoBox";
import { GetSiteResponse } from "@server/routers/site";

interface ResourceLayoutProps {
    children: React.ReactNode;
    params: Promise<{ resourceId: number | string; orgId: string }>;
}

export default async function ResourceLayout(props: ResourceLayoutProps) {
    const params = await props.params;

    const { children } = props;

    let authInfo = null;
    let resource = null;
    let site = null;
    try {
        const res = await internal.get<AxiosResponse<GetResourceResponse>>(
            `/resource/${params.resourceId}`,
            await authCookieHeader()
        );
        resource = res.data.data;
    } catch {
        redirect(`/${params.orgId}/settings/resources`);
    }

    if (!resource) {
        redirect(`/${params.orgId}/settings/resources`);
    }

    // Fetch site info
    if (resource.siteId) {
        try {
            const res = await internal.get<AxiosResponse<GetSiteResponse>>(
                `/site/${resource.siteId}`,
                await authCookieHeader()
            );
            site = res.data.data;
        } catch {
            redirect(`/${params.orgId}/settings/resources`);
        }
    }

    try {
        const res = await internal.get<
            AxiosResponse<GetResourceAuthInfoResponse>
        >(`/resource/${resource.resourceId}/auth`, await authCookieHeader());
        authInfo = res.data.data;
    } catch {
        redirect(`/${params.orgId}/settings/resources`);
    }

    if (!authInfo) {
        redirect(`/${params.orgId}/settings/resources`);
    }

    let org = null;
    try {
        const getOrg = cache(async () =>
            internal.get<AxiosResponse<GetOrgResponse>>(
                `/org/${params.orgId}`,
                await authCookieHeader()
            )
        );
        const res = await getOrg();
        org = res.data.data;
    } catch {
        redirect(`/${params.orgId}/settings/resources`);
    }

    if (!org) {
        redirect(`/${params.orgId}/settings/resources`);
    }

    const navItems = [
        {
            title: "General",
            href: `/{orgId}/settings/resources/{resourceId}/general`
        },
        {
            title: "Proxy",
            href: `/{orgId}/settings/resources/{resourceId}/proxy`
        }
    ];

    if (resource.http) {
        navItems.push({
            title: "Authentication",
            href: `/{orgId}/settings/resources/{resourceId}/authentication`
        });
        navItems.push({
            title: "Rules",
            href: `/{orgId}/settings/resources/{resourceId}/rules`
        });
    }

    return (
        <>
            <SettingsSectionTitle
                title={`${resource?.name} Settings`}
                description="Configure the settings on your resource"
            />

            <OrgProvider org={org}>
                <ResourceProvider
                    site={site}
                    resource={resource}
                    authInfo={authInfo}
                >
                    <div className="space-y-6">
                        <ResourceInfoBox />
                        <HorizontalTabs items={navItems}>
                            {children}
                        </HorizontalTabs>
                    </div>
                </ResourceProvider>
            </OrgProvider>
        </>
    );
}
