"use client";

import React, { useState } from "react";
import { Header } from "@app/components/Header";
import { SidebarNav } from "@app/components/SidebarNav";
import { TopBar } from "@app/components/TopBar";
import { OrgSelector } from "@app/components/OrgSelector";
import { cn } from "@app/lib/cn";
import { ListOrgsResponse } from "@server/routers/org";
import SupporterStatus from "@app/components/SupporterStatus";
import { Separator } from "@app/components/ui/separator";
import { Button } from "@app/components/ui/button";
import { ExternalLink, Menu, X, Server } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetTrigger,
    SheetTitle,
    SheetDescription
} from "@app/components/ui/sheet";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { Breadcrumbs } from "@app/components/Breadcrumbs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserContext } from "@app/hooks/useUserContext";

interface LayoutProps {
    children: React.ReactNode;
    orgId?: string;
    orgs?: ListOrgsResponse["orgs"];
    navItems?: Array<{
        title: string;
        href: string;
        icon?: React.ReactNode;
        children?: Array<{
            title: string;
            href: string;
            icon?: React.ReactNode;
        }>;
    }>;
    showSidebar?: boolean;
    showBreadcrumbs?: boolean;
    showHeader?: boolean;
    showTopBar?: boolean;
}

export function Layout({
    children,
    orgId,
    orgs,
    navItems = [],
    showSidebar = true,
    showBreadcrumbs = true,
    showHeader = true,
    showTopBar = true
}: LayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { env } = useEnvContext();
    const pathname = usePathname();
    const isAdminPage = pathname?.startsWith("/admin");
    const { user } = useUserContext();

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Mobile Menu Button */}
            {showSidebar && (
                <div className="md:hidden fixed top-4 left-4 z-50">
                    <Sheet
                        open={isMobileMenuOpen}
                        onOpenChange={setIsMobileMenuOpen}
                    >
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="left"
                            className="w-64 p-0 flex flex-col h-full"
                        >
                            <SheetTitle className="sr-only">
                                Navigation Menu
                            </SheetTitle>
                            <SheetDescription className="sr-only">
                                Main navigation menu for the application
                            </SheetDescription>
                            {showHeader && (
                                <div className="flex h-16 items-center border-b px-4 shrink-0">
                                    <Header orgId={orgId} orgs={orgs} />
                                </div>
                            )}
                            <div className="flex-1 overflow-y-auto p-4">
                                <SidebarNav
                                    items={navItems}
                                    onItemClick={() =>
                                        setIsMobileMenuOpen(false)
                                    }
                                />
                                {!isAdminPage && (
                                    <div className="mt-8 pt-4 border-t">
                                        <Link
                                            href="/admin"
                                            className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-4 py-2 rounded-md bg-primary/10 hover:bg-primary/20 w-full"
                                            onClick={() =>
                                                setIsMobileMenuOpen(false)
                                            }
                                        >
                                            <Server className="h-4 w-4" />
                                            Server Admin
                                        </Link>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 space-y-4 border-t shrink-0">
                                <SupporterStatus />
                                <OrgSelector orgId={orgId} orgs={orgs} />
                                {env?.app?.version && (
                                    <div className="text-xs text-muted-foreground text-center">
                                        v{env.app.version}
                                    </div>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            )}

            {/* Desktop Sidebar */}
            {showSidebar && (
                <div className="hidden md:flex w-64 border-r bg-card flex-col h-full shrink-0">
                    {showHeader && (
                        <div className="flex h-16 items-center border-b px-4 shrink-0">
                            <Header orgId={orgId} orgs={orgs} />
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                        <div className="flex-1">
                            <SidebarNav items={navItems} />
                        </div>
                        {!isAdminPage && user.serverAdmin && (
                            <div className="mt-8 pt-4 border-t">
                                <Link
                                    href="/admin"
                                    className="flex items-center justify-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors px-4 py-2 rounded-md bg-primary/10 hover:bg-primary/20 w-full"
                                >
                                    <Server className="h-4 w-4" />
                                    Server Admin
                                </Link>
                            </div>
                        )}
                    </div>
                    <div className="p-4 space-y-4 border-t shrink-0">
                        <SupporterStatus />
                        <OrgSelector orgId={orgId} orgs={orgs} />
                        <div className="space-y-2">
                            <div className="text-xs text-muted-foreground text-center">
                                <Link
                                    href="https://github.com/fosrl/pangolin"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1"
                                >
                                    Open Source
                                    <ExternalLink size={12} />
                                </Link>
                            </div>
                            {env?.app?.version && (
                                <div className="text-xs text-muted-foreground text-center">
                                    v{env.app.version}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main content */}
            <div
                className={cn(
                    "flex-1 flex flex-col h-full min-w-0",
                    !showSidebar && "w-full"
                )}
            >
                {showTopBar && (
                    <div className="h-16 border-b shrink-0 bg-card">
                        <div className="flex h-full items-center justify-end px-4">
                            <TopBar orgId={orgId} orgs={orgs} />
                        </div>
                    </div>
                )}
                {showBreadcrumbs && <Breadcrumbs />}
                <main className="flex-1 overflow-y-auto p-3 md:p-6 w-full">
                    <div className="container mx-auto max-w-12xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
