"use client";

import { HorizontalTabs } from "@app/components/HorizontalTabs";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";

interface AccessPageHeaderAndNavProps {
    children: React.ReactNode;
    hasInvitations: boolean;
}

export default function AccessPageHeaderAndNav({
    children,
    hasInvitations
}: AccessPageHeaderAndNavProps) {
    const navItems = [
        {
            title: "Users",
            href: `/{orgId}/settings/access/users`
        },
        {
            title: "Roles",
            href: `/{orgId}/settings/access/roles`
        }
    ];

    if (hasInvitations) {
        navItems.push({
            title: "Invitations",
            href: `/{orgId}/settings/access/invitations`
        });
    }

    return (
        <>
            <SettingsSectionTitle
                title="Manage Users & Roles"
                description="Invite users and add them to roles to manage access to your organization"
            />

            <HorizontalTabs items={navItems}>
                {children}
            </HorizontalTabs>
        </>
    );
}
