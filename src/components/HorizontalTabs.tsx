"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@app/lib/cn";
import { buttonVariants } from "@/components/ui/button";

interface HorizontalTabsProps {
    children: React.ReactNode;
    items: Array<{
        title: string;
        href: string;
        icon?: React.ReactNode;
    }>;
    disabled?: boolean;
}

export function HorizontalTabs({
    children,
    items,
    disabled = false
}: HorizontalTabsProps) {
    const pathname = usePathname();
    const params = useParams();

    function hydrateHref(href: string) {
        return href
            .replace("{orgId}", params.orgId as string)
            .replace("{resourceId}", params.resourceId as string)
            .replace("{niceId}", params.niceId as string);
    }

    return (
        <div className="space-y-6">
            <div className="relative">
                <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex space-x-4 border-b min-w-max">
                        {items.map((item) => {
                            const hydratedHref = hydrateHref(item.href);
                            const isActive =
                                pathname.startsWith(hydratedHref) &&
                                !pathname.includes("create");

                            return (
                                <Link
                                    key={hydratedHref}
                                    href={hydratedHref}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                                        isActive
                                            ? "border-b-2 border-primary text-primary"
                                            : "text-muted-foreground hover:text-foreground",
                                        disabled && "cursor-not-allowed"
                                    )}
                                    onClick={
                                        disabled
                                            ? (e) => e.preventDefault()
                                            : undefined
                                    }
                                    tabIndex={disabled ? -1 : undefined}
                                    aria-disabled={disabled}
                                >
                                    {item.icon ? (
                                        <div className="flex items-center space-x-2">
                                            {item.icon}
                                            <span>{item.title}</span>
                                        </div>
                                    ) : (
                                        item.title
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="space-y-6">{children}</div>
        </div>
    );
}
