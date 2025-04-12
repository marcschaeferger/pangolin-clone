"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { cn } from "@app/lib/cn";
import { buttonVariants } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
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

    const [selectedValue, setSelectedValue] =
        React.useState<string>(getSelectedValue());

    useEffect(() => {
        setSelectedValue(getSelectedValue());
    }, [usePathname()]);

    const router = useRouter();

    const handleSelectChange = (value: string) => {
        if (!disabled) {
            router.push(value);
        }
    };

    function getSelectedValue() {
        let foundHref = "";
        for (const item of items) {
            const hydratedHref = hydrateHref(item.href);
            if (hydratedHref === pathname) {
                foundHref = hydratedHref;
                break;
            }
            if (item.children) {
                for (const child of item.children) {
                    const hydratedChildHref = hydrateHref(child.href);
                    if (hydratedChildHref === pathname) {
                        foundHref = hydratedChildHref;
                        break;
                    }
                }
            }
            if (foundHref) break;
        }
        return foundHref;
    }

    function hydrateHref(val: string): string {
        return val
            .replace("{orgId}", orgId)
            .replace("{niceId}", niceId)
            .replace("{resourceId}", resourceId)
            .replace("{userId}", userId);
    }

    function renderItems(items: SidebarNavItem[]) {
        return items.map((item) => (
            <div key={hydrateHref(item.href)}>
                <Link
                    href={hydrateHref(item.href)}
                    className={cn(
                        buttonVariants({ variant: "ghost" }),
                        pathname === hydrateHref(item.href) &&
                            !pathname.includes("create")
                            ? "bg-accent hover:bg-accent dark:bg-border dark:hover:bg-border"
                            : "hover:bg-transparent hover:underline",
                        "justify-start",
                        disabled && "cursor-not-allowed"
                    )}
                    onClick={disabled ? (e) => e.preventDefault() : undefined}
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
                {item.children && (
                    <div className="ml-4 space-y-2">
                        {item.children.map((child) => (
                            <div
                                key={hydrateHref(child.href)}
                                className="flex items-center space-x-2"
                            >
                                <CornerDownRight className="h-4 w-4 text-gray-500" />
                                <Link
                                    href={hydrateHref(child.href)}
                                    className={cn(
                                        buttonVariants({ variant: "ghost" }),
                                        pathname === hydrateHref(child.href) &&
                                            !pathname.includes("create")
                                            ? "bg-accent hover:bg-accent dark:bg-border dark:hover:bg-border"
                                            : "hover:bg-transparent hover:underline",
                                        "justify-start",
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
                                    {child.icon ? (
                                        <div className="flex items-center space-x-2">
                                            {child.icon}
                                            <span>{child.title}</span>
                                        </div>
                                    ) : (
                                        child.title
                                    )}
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ));
    }

    return (
        <div>
            <div className="block lg:hidden">
                <Select
                    defaultValue={selectedValue}
                    value={selectedValue}
                    onValueChange={handleSelectChange}
                    disabled={disabled}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                        {items.flatMap((item) => {
                            const topLevelItem = (
                                <SelectItem
                                    key={hydrateHref(item.href)}
                                    value={hydrateHref(item.href)}
                                >
                                    {item.icon ? (
                                        <div className="flex items-center space-x-2">
                                            {item.icon}
                                            <span>{item.title}</span>
                                        </div>
                                    ) : (
                                        item.title
                                    )}
                                </SelectItem>
                            );
                            const childItems =
                                item.children?.map((child) => (
                                    <SelectItem
                                        key={hydrateHref(child.href)}
                                        value={hydrateHref(child.href)}
                                        className="pl-8"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <CornerDownRight className="h-4 w-4 text-gray-500" />
                                            {child.icon ? (
                                                <>
                                                    {child.icon}
                                                    <span>{child.title}</span>
                                                </>
                                            ) : (
                                                <span>{child.title}</span>
                                            )}
                                        </div>
                                    </SelectItem>
                                )) || [];
                            return [topLevelItem, ...childItems];
                        })}
                    </SelectContent>
                </Select>
            </div>
            <nav
                className={cn(
                    "hidden lg:flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-3 pr-8",
                    disabled && "opacity-50 pointer-events-none",
                    className
                )}
                {...props}
            >
                {renderItems(items)}
            </nav>
        </div>
    );
}
