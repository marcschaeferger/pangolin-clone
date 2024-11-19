"use client";

import { SidebarNav } from "@app/components/sidebar-nav";
import React from "react";

interface SideBarSettingsProps {
    children: React.ReactNode;
    sidebarNavItems: Array<{
        title: string;
        href: string;
        icon?: React.ReactNode;
    }>;
    disabled?: boolean;
    limitWidth?: boolean;
}

export function SidebarSettings({
    children,
    sidebarNavItems,
    disabled,
    limitWidth,
}: SideBarSettingsProps) {
    return (
        <div className="space-y-6 0 pb-16k">
            <div className="flex flex-col space-y-6 lg:flex-row lg:space-x-32 lg:space-y-0">
                <aside className="-mx-4 lg:w-1/5">
                    <SidebarNav items={sidebarNavItems} disabled={disabled} />
                </aside>
                <div className={`flex-1 ${limitWidth ? "lg:max-w-2xl" : ""}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}
