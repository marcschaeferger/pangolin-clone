"use client";

import { SidebarNav } from "@app/components/SidebarNav";
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
    limitWidth
}: SideBarSettingsProps) {
    return (
        <div className="space-y-4">
            <div className="flex flex-col space-y-4 lg:flex-row lg:space-x-6 lg:space-y-0">
                <aside className="lg:w-1/5">
                    <SidebarNav items={sidebarNavItems} disabled={disabled} />
                </aside>
                <div className={`flex-1 ${limitWidth ? "lg:max-w-2xl" : ""}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}
