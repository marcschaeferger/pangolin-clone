"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@app/lib/cn";

interface BreadcrumbItem {
    label: string;
    href: string;
}

export function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    const breadcrumbs: BreadcrumbItem[] = segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        let label = segment;

        // Format labels
        if (segment === "settings") {
            label = "Settings";
        } else if (segment === "sites") {
            label = "Sites";
        } else if (segment === "resources") {
            label = "Resources";
        } else if (segment === "access") {
            label = "Access Control";
        } else if (segment === "general") {
            label = "General";
        } else if (segment === "share-links") {
            label = "Shareable Links";
        } else if (segment === "users") {
            label = "Users";
        } else if (segment === "roles") {
            label = "Roles";
        } else if (segment === "invitations") {
            label = "Invitations";
        } else if (segment === "connectivity") {
            label = "Connectivity";
        } else if (segment === "authentication") {
            label = "Authentication";
        }

        return { label, href };
    });

    return (
        <div className="border-b px-4 py-2 overflow-x-auto scrollbar-hide bg-card">
            <nav className="flex items-center space-x-1 text-sm text-muted-foreground whitespace-nowrap">
                {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.href} className="flex items-center whitespace-nowrap">
                        {index !== 0 && <ChevronRight className="h-4 w-4" />}
                        <Link
                            href={crumb.href}
                            className={cn(
                                "ml-1 hover:text-foreground whitespace-nowrap",
                                index === breadcrumbs.length - 1 &&
                                    "text-foreground font-medium"
                            )}
                        >
                            {crumb.label}
                        </Link>
                    </div>
                ))}
            </nav>
        </div>
    );
}
