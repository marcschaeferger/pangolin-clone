"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TopbarNavProps extends React.HTMLAttributes<HTMLElement> {
    items: {
        href: string;
        title: string;
        icon: React.ReactNode;
    }[];
    disabled?: boolean;
    orgId: string;
}

export function TopbarNav({
    className,
    items,
    disabled = false,
    orgId,
    ...props
}: TopbarNavProps) {
    const pathname = usePathname();

    return (
        <nav
            className={cn(
                "flex overflow-x-auto space-x-4 lg:space-x-6",
                disabled && "opacity-50 pointer-events-none",
                className
            )}
            {...props}
        >
            {items.map((item) => (
                <Link
                    key={item.href}
                    href={item.href.replace("{orgId}", orgId)}
                    className={cn(
                        "relative px-3 py-3 text-md",
                        pathname.startsWith(item.href.replace("{orgId}", orgId))
                            ? "border-b-2 border-primary text-primary font-medium"
                            : "hover:text-primary text-muted-foreground font-medium",
                        "whitespace-nowrap",
                        disabled && "cursor-not-allowed"
                    )}
                    onClick={disabled ? (e) => e.preventDefault() : undefined}
                    tabIndex={disabled ? -1 : undefined}
                    aria-disabled={disabled}
                >
                    <div className="flex items-center gap-2 relative px-2 py-0.5 rounded-md">
                        {item.icon && (
                            <div className="hidden md:block">{item.icon}</div>
                        )}
                        <span className="relative z-10">{item.title}</span>
                    </div>
                </Link>
            ))}
        </nav>
    );
}
