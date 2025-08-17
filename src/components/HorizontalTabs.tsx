"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@app/lib/cn";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@app/components/ui/badge";
import { useLicenseStatusContext } from "@app/hooks/useLicenseStatusContext";
import { useTranslations } from "next-intl";
import { NavigationGuard } from "@/utils/navigationGuard";
import { UnsavedChangesIndicator } from "./navigation-protection/unsaved-changes-indicator";
import { clearTabSpecificStorage, checkGlobalUnsavedChanges } from "@/utils/formHelpers";
import { useRouter } from "next/navigation";

export type HorizontalTabs = Array<{
    title: string;
    href: string;
    icon?: React.ReactNode;
    showProfessional?: boolean;
    storageKey?: string; // Add this for unsaved changes tracking
}>;

interface HorizontalTabsProps {
    children: React.ReactNode;
    items: HorizontalTabs;
    disabled?: boolean;
    // Optional: custom function to get storage keys from paths
    getStorageKeyFromPath?: (path: string) => string | null;
}

export function HorizontalTabs({
    children,
    items,
    disabled = false,
    getStorageKeyFromPath
}: HorizontalTabsProps) {
    const pathname = usePathname();
    const params = useParams();
    const { licenseStatus, isUnlocked } = useLicenseStatusContext();
    const t = useTranslations();
    const router = useRouter();
    const navigationGuard = NavigationGuard.getInstance();

    function hydrateHref(href: string) {
        return href
            .replace("{orgId}", params.orgId as string)
            .replace("{resourceId}", params.resourceId as string)
            .replace("{niceId}", params.niceId as string)
            .replace("{userId}", params.userId as string)
            .replace("{clientId}", params.clientId as string)
            .replace("{apiKeyId}", params.apiKeyId as string);
    }

    const handleTabNavigation = (e: React.MouseEvent, href: string) => {
        e.preventDefault();
        
        if (navigationGuard.getHasUnsavedChanges()) {
            const confirmed = navigationGuard.confirmNavigation();
            if (confirmed) {
                navigationGuard.clearUnsavedChanges();
                // Clear all form storage for tabs that have storage keys
                items.forEach(item => {
                    const storageKey = item.storageKey;
                    if (storageKey) {
                        clearTabSpecificStorage(storageKey);
                    }
                });
                router.push(href);
            }
        } else {
            router.push(href);
        }
    };

    const checkTabHasChanges = (item: HorizontalTabs[0]): boolean => {
        const storageKey = item.storageKey;
        if (!storageKey) return false;
        return checkGlobalUnsavedChanges(storageKey);
    };

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
                            const isProfessional =
                                item.showProfessional && !isUnlocked();
                            const isDisabled =
                                disabled || (isProfessional && !isUnlocked());
                            const hasUnsavedChanges = checkTabHasChanges(item);

                            return (
                                <Link
                                    key={hydratedHref}
                                    href={isProfessional ? "#" : hydratedHref}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                                        isActive
                                            ? "border-b-2 border-primary text-primary"
                                            : "text-muted-foreground hover:text-foreground",
                                        isDisabled && "cursor-not-allowed"
                                    )}
                                    onClick={(e) => {
                                        if (isDisabled) {
                                            e.preventDefault();
                                        } else if (!isProfessional) {
                                            handleTabNavigation(e, hydratedHref);
                                        }
                                    }}
                                    tabIndex={isDisabled ? -1 : undefined}
                                    aria-disabled={isDisabled}
                                >
                                    <div
                                        className={cn(
                                            "flex items-center space-x-2",
                                            isDisabled && "opacity-60"
                                        )}
                                    >
                                        {item.icon && item.icon}
                                        <span>{item.title}</span>
                                        {hasUnsavedChanges && (
                                            <UnsavedChangesIndicator
                                                hasUnsavedChanges={true}
                                                variant="badge"
                                                className="scale-75"
                                            />
                                        )}
                                        {isProfessional && (
                                            <Badge
                                                variant="outlinePrimary"
                                                className="ml-2"
                                            >
                                                {t('licenseBadge')}
                                            </Badge>
                                        )}
                                    </div>
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