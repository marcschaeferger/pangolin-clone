"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Globe, Database, Cog, Settings, Waypoints, Combine, Crown, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useUserContext } from "@app/hooks/useUserContext";

interface OrgStat {
    label: string;
    value: number;
    icon: React.ReactNode;
    href?: string;
    clickable?: boolean;
}

type OrganizationLandingCardProps = {
    overview: {
        orgName: string;
        stats: {
            sites: number;
            resources: number;
            users: number;
        };
        userRole: string;
        isAdmin: boolean;
        isOwner: boolean;
        orgId: string;
    };
};

export default function OrganizationLandingCard(
    props: OrganizationLandingCardProps
) {
    const [orgData] = useState(props);
    const t = useTranslations();
    const { user } = useUserContext();

    // For members, show simplified stats that are relevant to them
    const orgStats: OrgStat[] = orgData.overview.isAdmin ? [
        {
            label: t('sites'),
            value: orgData.overview.stats.sites,
            icon: <Combine className="h-6 w-6" />
        },
        {
            label: t('resources'),
            value: orgData.overview.stats.resources,
            icon: <Waypoints className="h-6 w-6" />
        },
        {
            label: t('users'),
            value: orgData.overview.stats.users,
            icon: <Users className="h-6 w-6" />
        }
    ] : [
        {
            label: t('resources'),
            value: orgData.overview.stats.resources,
            icon: <Waypoints className="h-6 w-6" />,
            href: `/${orgData.overview.orgId}/account/my-resources`,
            clickable: true
        }
    ];

    const roleDisplayName = orgData.overview.isOwner ? t('accessRoleOwner') : orgData.overview.userRole;
    const roleIcon = orgData.overview.isOwner ? <Crown className="h-3 w-3" /> : <User className="h-3 w-3" />;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <CardTitle className="text-3xl font-bold">
                        {orgData.overview.orgName}
                    </CardTitle>
                    <Badge 
                        variant={orgData.overview.isOwner ? "default" : "secondary"} 
                        className="flex items-center gap-1.5 px-3 py-1"
                    >
                        {roleIcon}
                        <span className="text-sm font-medium">{roleDisplayName}</span>
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className={`grid grid-cols-1 ${orgData.overview.isAdmin ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4`}>
                    {orgStats.map((stat, index) => {
                        const StatContent = (
                            <div
                                className={`flex flex-col items-center p-6 bg-secondary rounded-lg ${
                                    stat.clickable ? 'hover:bg-secondary/80 transition-colors cursor-pointer' : ''
                                }`}
                            >
                                {stat.icon}
                                <span className="mt-2 text-3xl font-bold">
                                    {stat.value}
                                </span>
                                <span className="text-lg text-muted-foreground">
                                    {stat.label}
                                </span>
                                {stat.clickable && (
                                    <span className="text-xs text-muted-foreground mt-1">
                                        Click to view
                                    </span>
                                )}
                            </div>
                        );

                        return (
                            <div key={index}>
                                {stat.href ? (
                                    <Link href={stat.href} className="block">
                                        {StatContent}
                                    </Link>
                                ) : (
                                    StatContent
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
            {orgData.overview.isAdmin && (
                <CardFooter className="flex justify-center">
                    <Link href={`/${orgData.overview.orgId}/settings`}>
                        <Button size="lg" className="w-full md:w-auto">
                            <Settings className="mr-2 h-4 w-4" />
                            {t('orgGeneralSettings')}
                        </Button>
                    </Link>
                </CardFooter>
            )}
        </Card>
    );
}
