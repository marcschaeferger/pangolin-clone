"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@app/lib/cn";
import { ChevronDown, ChevronRight } from "lucide-react";

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

    // Initialize expanded items based on autoExpand property
    useEffect(() => {
        const autoExpanded = new Set<string>();

        function findAutoExpanded(items: SidebarNavItem[]) {
            items.forEach(item => {
                const hydratedHref = hydrateHref(item.href);
                if (item.autoExpand) {
                    autoExpanded.add(hydratedHref);
                }
                if (item.children) {
                    findAutoExpanded(item.children);
                }
            });
        }

        findAutoExpanded(items);
        setExpandedItems(autoExpanded);
    }, [items]);

    function hydrateHref(val: string): string {
        return val
            .replace("{orgId}", orgId)
            .replace("{niceId}", niceId)
            .replace("{resourceId}", resourceId)
            .replace("{userId}", userId);
    }

    function toggleItem(href: string) {
        setExpandedItems(prev => {
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
                    <div className="flex items-center group" style={{ marginLeft: `${indent}px` }}>
                        <Link
                            href={hydratedHref}
                            className={cn(
                                "flex items-center py-1 w-full transition-colors",
                                isActive
                                    ? "text-primary font-medium"
                                    : "text-muted-foreground hover:text-foreground",
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
                            {item.icon && <span className="mr-2">{item.icon}</span>}
                            {item.title}
                        </Link>
                        {hasChildren && (
                            <button
                                onClick={() => toggleItem(hydratedHref)}
                                className="p-2 hover:bg-muted rounded-md ml-auto"
                                disabled={disabled}
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </button>
                        )}
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
