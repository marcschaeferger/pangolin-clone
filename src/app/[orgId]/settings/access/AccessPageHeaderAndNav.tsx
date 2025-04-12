"use client";

import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { SidebarSettings } from "@app/components/SidebarSettings";

type AccessPageHeaderAndNavProps = {
    children: React.ReactNode;
    hasInvitations: boolean;
};

export default function AccessPageHeaderAndNav({
    children,
    hasInvitations
}: AccessPageHeaderAndNavProps) {
    const sidebarNavItems = [
        {
            title: "Users",
            href: `/{orgId}/settings/access/users`,
            children: hasInvitations
                ? [
                      {
                          title: "Invitations",
                          href: `/{orgId}/settings/access/invitations`
                      }
                  ]
                : []
        },
        {
            title: "Roles",
            href: `/{orgId}/settings/access/roles`
        }
    ];

    return (
        <>
            <SettingsSectionTitle
                title="Manage Users & Roles"
                description="Invite users and add them to roles to manage access to your organization"
            />

            <SidebarSettings sidebarNavItems={sidebarNavItems}>
                {children}
            </SidebarSettings>
        </>
    );
}
