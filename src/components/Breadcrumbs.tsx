"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@app/lib/cn";

interface BreadcrumbItem {
    label: string;
    href: string;
}

function formatBreadcrumbLabel(segment: string): string {
    // Map specific segments to user-friendly names
    const labelMap: Record<string, string> = {
        'account': 'Account',
        'my-resources': 'My Resources',
        'settings': 'Settings',
        'access': 'Access Control',
        'users': 'Users',
        'resources': 'Resources',
        'sites': 'Sites'
    };
    
    return labelMap[segment] || decodeURIComponent(segment);
}

export function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    const breadcrumbs: BreadcrumbItem[] = segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const label = formatBreadcrumbLabel(segment);
        return { label, href };
    });

    return (
        <nav className="flex items-center space-x-1 text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center flex-nowrap">
                    {index !== 0 && <ChevronRight className="h-4 w-4 flex-shrink-0" />}
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
    );
}
