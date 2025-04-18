"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@app/lib/cn";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useUserContext } from "@app/hooks/useUserContext";

export interface SidebarNavItem {
    href: string;
    title: string;
    icon?: React.ReactNode;
    children?: SidebarNavItem[];
    autoExpand?: boolean;
}

export interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
    items: SidebarNavItem[];
    disabled?: boolean;
    onItemClick?: () => void;
}

export function SidebarNav({
    className,
    items,
    disabled = false,
    onItemClick,
    ...props
}: SidebarNavProps) {
    const pathname = usePathname();
    const params = useParams();
    const orgId = params.orgId as string;
    const niceId = params.niceId as string;
    const resourceId = params.resourceId as string;
    const userId = params.userId as string;
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    const { user } = useUserContext();

    function hydrateHref(val: string): string {
        return val
            .replace("{orgId}", orgId)
            .replace("{niceId}", niceId)
            .replace("{resourceId}", resourceId)
            .replace("{userId}", userId);
    }

    // Initialize expanded items based on autoExpand property and current path
    useEffect(() => {
        const autoExpanded = new Set<string>();

        function findAutoExpandedAndActivePath(
            items: SidebarNavItem[],
            parentHrefs: string[] = []
        ) {
            items.forEach((item) => {
                const hydratedHref = hydrateHref(item.href);

                // Add current item's href to the path
                const currentPath = [...parentHrefs, hydratedHref];

                // Auto expand if specified or if this item or any child is active
                if (item.autoExpand || pathname.startsWith(hydratedHref)) {
                    // Expand all parent sections when a child is active
                    currentPath.forEach((href) => autoExpanded.add(href));
                }

                // Recursively check children
                if (item.children) {
                    findAutoExpandedAndActivePath(item.children, currentPath);
                }
            });
        }

        findAutoExpandedAndActivePath(items);
        setExpandedItems(autoExpanded);
    }, [items, pathname]);

    function toggleItem(href: string) {
        setExpandedItems((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(href)) {
                newSet.delete(href);
            } else {
                newSet.add(href);
            }
            return newSet;
        });
    }

    function renderItems(items: SidebarNavItem[], level = 0) {
        return items.map((item) => {
            const hydratedHref = hydrateHref(item.href);
            const isActive = pathname.startsWith(hydratedHref);
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.has(hydratedHref);
            const indent = level * 16; // Base indent for each level

            return (
                <div key={hydratedHref}>
                    <div
                        className="flex items-center group"
                        style={{ marginLeft: `${indent}px` }}
                    >
                        <div
                            className={cn(
                                "flex items-center w-full transition-colors rounded-md",
                                isActive && level === 0 && "bg-primary/10"
                            )}
                        >
                            <Link
                                href={hydratedHref}
                                className={cn(
                                    "flex items-center w-full px-3 py-2",
                                    isActive
                                        ? "text-primary font-medium"
                                        : "text-muted-foreground group-hover:text-foreground",
                                    disabled && "cursor-not-allowed opacity-60"
                                )}
                                onClick={(e) => {
                                    if (disabled) {
                                        e.preventDefault();
                                    } else if (onItemClick) {
                                        onItemClick();
                                    }
                                }}
                                tabIndex={disabled ? -1 : undefined}
                                aria-disabled={disabled}
                            >
                                {item.icon && (
                                    <span className="mr-3">{item.icon}</span>
                                )}
                                {item.title}
                            </Link>
                            {hasChildren && (
                                <button
                                    onClick={() => toggleItem(hydratedHref)}
                                    className="p-2 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                                    disabled={disabled}
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-5 w-5" />
                                    ) : (
                                        <ChevronRight className="h-5 w-5" />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                    {hasChildren && isExpanded && (
                        <div className="space-y-1 mt-1">
                            {renderItems(item.children || [], level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    }

    return (
        <nav
            className={cn(
                "flex flex-col space-y-2",
                disabled && "pointer-events-none opacity-60",
                className
            )}
            {...props}
        >
            {renderItems(items)}
        </nav>
    );
}
