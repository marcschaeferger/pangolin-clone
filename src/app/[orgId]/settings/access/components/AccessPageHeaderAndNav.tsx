"use client";

import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
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
            <SettingsSectionTitle
                title="Users & Roles"
                description="Invite users and add them to roles to manage access to your
            organization"
            />

            <SidebarSettings sidebarNavItems={sidebarNavItems}>
                {children}
            </SidebarSettings>
        </>
    );
}
