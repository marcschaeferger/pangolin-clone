import { Metadata } from "next";
import Image from "next/image";

import { Separator } from "@/components/ui/separator";
import { SidebarNav } from "@/components/sidebar-nav";
import SiteProvider from "@app/providers/SiteProvider";
import { internal } from "@app/api";
import { GetSiteResponse } from "@server/routers/site";
import { AxiosResponse } from "axios";
import { redirect } from "next/navigation";
import { authCookieHeader } from "@app/api/cookies";
import Link from "next/link";
import { ArrowLeft, ChevronLeft } from "lucide-react";

export const metadata: Metadata = {
    title: "Forms",
    description: "Advanced form example using react-hook-form and Zod.",
};

const sidebarNavItems = [
    {
        title: "Profile",
        href: "/{orgId}/sites/{siteId}",
    },
    {
        title: "Appearance",
        href: "/{orgId}/sites/{siteId}/appearance",
    },
    {
        title: "Notifications",
        href: "/{orgId}/sites/{siteId}/notifications",
    },
    {
        title: "Display",
        href: "/{orgId}/sites/{siteId}/display",
    },
];

interface SettingsLayoutProps {
    children: React.ReactNode;
    params: { siteId: string; orgId: string };
}

export default async function SettingsLayout({
    children,
    params,
}: SettingsLayoutProps) {
    let site = null;
    if (params.siteId !== "create") {
        try {
            const res = await internal.get<AxiosResponse<GetSiteResponse>>(
                `/site/${params.siteId}`,
                authCookieHeader(),
            );
            site = res.data.data;
        } catch {
            redirect(`/${params.orgId}/sites`);
        }
    }

    return (
        <>
            <div className="md:hidden">
                <Image
                    src="/configuration/forms-light.png"
                    width={1280}
                    height={791}
                    alt="Forms"
                    className="block dark:hidden"
                />
                <Image
                    src="/configuration/forms-dark.png"
                    width={1280}
                    height={791}
                    alt="Forms"
                    className="hidden dark:block"
                />
            </div>

            <div className="mb-4">
            <Link
                href={`/${params.orgId}/sites`}
                className="text-primary font-medium"
            >
                <div className="flex items-center gap-0.5 hover:underline">
                    <ChevronLeft />
                    <span>View all sites</span>
                </div>
            </Link>
            </div>

            <div className="hidden space-y-6 0 pb-16 md:block">
                <div className="space-y-0.5">
                    <h2 className="text-2xl font-bold tracking-tight">
                        {params.siteId == "create"
                            ? "New Site"
                            : site?.name + " Settings" || "Site Settings"
                        }
                    </h2>
                    <p className="text-muted-foreground">
                        {params.siteId == "create"
                            ? "Create a new site"
                            : "Configure the settings on your site: " +
                                  site?.name || ""}
                        .
                    </p>
                </div>
                <div className="flex flex-col space-y-6 lg:flex-row lg:space-x-12 lg:space-y-0">
                    <aside className="-mx-4 lg:w-1/5">
                        <SidebarNav
                            items={sidebarNavItems}
                            disabled={params.siteId == "create"}
                        />
                    </aside>
                    <div className="flex-1 lg:max-w-2xl">
                        <SiteProvider site={site}>{children}</SiteProvider>
                    </div>
                </div>
            </div>
        </>
    );
}
