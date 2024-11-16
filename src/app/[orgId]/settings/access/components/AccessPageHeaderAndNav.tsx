"use client";

import { SidebarSettings } from "@app/components/SidebarSettings";

type AccessPageHeaderAndNavProps = {
    children: React.ReactNode;
};

export default function AccessPageHeaderAndNav({
    children,
}: AccessPageHeaderAndNavProps) {
    const sidebarNavItems = [
        {
            title: "Users",
            href: `/{orgId}/settings/access/users`,
        },
        {
            title: "Roles",
            href: `/{orgId}/settings/access/roles`,
        },
    ];

    return (
        <>
            {" "}
            <div className="space-y-0.5 select-none mb-6">
                <h2 className="text-2xl font-bold tracking-tight">
                    Users & Roles
                </h2>
                <p className="text-muted-foreground">
                    Invite users and add them to roles to manage access to your
                    organization
                </p>
            </div>
            <SidebarSettings sidebarNavItems={sidebarNavItems}>
                {children}
            </SidebarSettings>
        </>
    );
}
