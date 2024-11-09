"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
    items: {
        href: string;
        title: string;
    }[];
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

    const router = useRouter();

    const handleSelectChange = (value: string) => {
        if (!disabled) {
            router.push(value);
        }
    };

    function getSelectedValue() {
        const item = items.find((item) => hydrateHref(item.href) === pathname);
        return hydrateHref(item?.href || "");
    }

    function hydrateHref(val: string): string {
        return val
            .replace("{orgId}", orgId)
            .replace("{niceId}", niceId)
            .replace("{resourceId}", resourceId);
    }

    return (
        <div>
            <div className="block lg:hidden px-4">
                <Select
                    onValueChange={handleSelectChange}
                    disabled={disabled}
                    defaultValue={getSelectedValue()}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                        {items.map((item) => (
                            <SelectItem
                                key={hydrateHref(item.href)}
                                value={hydrateHref(item.href)}
                            >
                                {item.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <nav
                className={cn(
                    "hidden lg:flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
                    disabled && "opacity-50 pointer-events-none",
                    className
                )}
                {...props}
            >
                {items.map((item) => (
                    <Link
                        key={item.href
                            .replace("{orgId}", orgId)
                            .replace("{niceId}", niceId)
                            .replace("{resourceId}", resourceId)}
                        href={item.href
                            .replace("{orgId}", orgId)
                            .replace("{niceId}", niceId)
                            .replace("{resourceId}", resourceId)}
                        className={cn(
                            buttonVariants({ variant: "ghost" }),
                            pathname ===
                                item.href
                                    .replace("{orgId}", orgId)
                                    .replace("{niceId}", niceId)
                                    .replace("{resourceId}", resourceId) &&
                                !pathname.includes("create")
                                ? "bg-muted hover:bg-muted dark:bg-border dark:hover:bg-border"
                                : "hover:bg-transparent hover:underline",
                            "justify-start",
                            disabled && "cursor-not-allowed"
                        )}
                        onClick={
                            disabled ? (e) => e.preventDefault() : undefined
                        }
                        tabIndex={disabled ? -1 : undefined}
                        aria-disabled={disabled}
                    >
                        {item.title}
                    </Link>
                ))}
            </nav>
        </div>
    );
}
