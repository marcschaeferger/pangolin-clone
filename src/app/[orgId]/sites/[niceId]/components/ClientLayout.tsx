"use client";

import { SidebarNav } from "@app/components/sidebar-nav";
import { useSiteContext } from "@app/hooks/useSiteContext";

const sidebarNavItems = [
    {
        title: "Profile",
        href: "/{orgId}/sites/{niceId}",
    },
    {
        title: "Appearance",
        href: "/{orgId}/sites/{niceId}/appearance",
    },
    {
        title: "Notifications",
        href: "/{orgId}/sites/{niceId}/notifications",
    },
    {
        title: "Display",
        href: "/{orgId}/sites/{niceId}/display",
    },
];

export function ClientLayout({ isCreate, children }: { isCreate: boolean; children: React.ReactNode }) {
    const { site } = useSiteContext();
    return (<div className="hidden space-y-6 0 pb-16 md:block">
        <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight">
                {isCreate
                    ? "New Site"
                    : site?.name + " Settings"}
            </h2>
            <p className="text-muted-foreground">
                {isCreate
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
                    disabled={isCreate}
                />
            </aside>
            <div className="flex-1 lg:max-w-2xl">
                {children}
            </div>
        </div>
    </div>);
}