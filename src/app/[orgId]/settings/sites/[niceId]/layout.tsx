import SiteProvider from "@app/providers/SiteProvider";
import { internal } from "@app/lib/api";
import { GetSiteResponse } from "@server/routers/site";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { authCookieHeader } from "@app/lib/api/cookies";
import { HorizontalTabs } from "@app/components/HorizontalTabs";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@app/components/ui/breadcrumb";
import SiteInfoCard from "./SiteInfoCard";

interface SettingsLayoutProps {
    children: React.ReactNode;
    params: Promise<{ niceId: string; orgId: string }>;
}

export default async function SettingsLayout(props: SettingsLayoutProps) {
    const params = await props.params;

    const { children } = props;

    let site = null;
    try {
        const res = await internal.get<AxiosResponse<GetSiteResponse>>(
            `/org/${params.orgId}/site/${params.niceId}`,
            await authCookieHeader()
        );
        site = res.data.data;
    } catch {
        redirect(`/${params.orgId}/settings/sites`);
    }

    const navItems = [
        {
            title: "General",
            href: "/{orgId}/settings/sites/{niceId}/general"
        }
    ];

    return (
        <>
            <SettingsSectionTitle
                title={`${site?.name} Settings`}
                description="Configure the settings on your site"
            />

            <SiteProvider site={site}>
                <div className="space-y-6">
                    <SiteInfoCard />
                    <HorizontalTabs items={navItems}>{children}</HorizontalTabs>
                </div>
            </SiteProvider>
        </>
    );
}
