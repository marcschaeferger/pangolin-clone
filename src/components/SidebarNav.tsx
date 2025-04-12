"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@app/lib/cn";
import { CornerDownRight } from "lucide-react";

interface SidebarNavItem {
    href: string;
    title: string;
    icon?: React.ReactNode;
    children?: SidebarNavItem[];
}

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
    items: SidebarNavItem[];
    disabled?: boolean;
}

export function SidebarNav({
    className,
    items,
    disabled = false,
    ...props
}: SidebarNavProps) {
    const pathname = usePathname();
    const params = useParams();
    const orgId = params.orgId as string;
    const niceId = params.niceId as string;
    const resourceId = params.resourceId as string;
    const userId = params.userId as string;

    function hydrateHref(val: string): string {
        return val
            .replace("{orgId}", orgId)
            .replace("{niceId}", niceId)
            .replace("{resourceId}", resourceId)
            .replace("{userId}", userId);
    }

    function renderItems(items: SidebarNavItem[]) {
        return items.map((item) => {
            const hydratedHref = hydrateHref(item.href);
            const isActive = pathname.startsWith(hydratedHref) && !pathname.includes("create");

            return (
                <div key={hydratedHref}>
                    <Link
                        href={hydratedHref}
                        className={cn(
                            "flex items-center py-2 px-3 w-full transition-colors",
                            isActive
                                ? "text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground",
                            disabled && "cursor-not-allowed opacity-60"
                        )}
                        onClick={disabled ? (e) => e.preventDefault() : undefined}
                        tabIndex={disabled ? -1 : undefined}
                        aria-disabled={disabled}
                    >
                        {item.icon && <span className="mr-2">{item.icon}</span>}
                        {item.title}
                    </Link>
                    {item.children && (
                        <div className="ml-4 space-y-1 mt-1">
                            {item.children.map((child) => {
                                const hydratedChildHref = hydrateHref(child.href);
                                const isChildActive = pathname.startsWith(hydratedChildHref) && !pathname.includes("create");

                                return (
                                    <Link
                                        key={hydratedChildHref}
                                        href={hydratedChildHref}
                                        className={cn(
                                            "flex items-center text-sm py-2 px-3 w-full transition-colors",
                                            isChildActive
                                                ? "text-primary font-medium"
                                                : "text-muted-foreground hover:text-foreground",
                                            disabled && "cursor-not-allowed opacity-60"
                                        )}
                                        onClick={disabled ? (e) => e.preventDefault() : undefined}
                                        tabIndex={disabled ? -1 : undefined}
                                        aria-disabled={disabled}
                                    >
                                        <CornerDownRight className="h-4 w-4 text-muted-foreground/70 mr-2" />
                                        {child.icon && <span className="mr-2">{child.icon}</span>}
                                        {child.title}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        });
    }

    return (
        <nav
            className={cn(
                "flex flex-col space-y-1",
                disabled && "pointer-events-none opacity-60",
                className
            )}
            {...props}
        >
            {renderItems(items)}
        </nav>
    );
}
