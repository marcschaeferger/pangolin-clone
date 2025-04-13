import { Home, Settings, Users, Link as LinkIcon, Waypoints, Combine } from "lucide-react";

export const rootNavItems = [
    {
        title: "Home",
        href: "/",
        icon: <Home className="h-4 w-4" />
    }
];

export const orgNavItems = [
    {
        title: "Overview",
        href: "/{orgId}",
        icon: <Home className="h-4 w-4" />
    },
    {
        title: "Sites",
        href: "/{orgId}/settings/sites",
        icon: <Combine className="h-4 w-4" />
    },
    {
        title: "Resources",
        href: "/{orgId}/settings/resources",
        icon: <Waypoints className="h-4 w-4" />
    },
    {
        title: "Access Control",
        href: "/{orgId}/settings/access",
        icon: <Users className="h-4 w-4" />,
        children: [
            {
                title: "Users",
                href: "/{orgId}/settings/access/users"
            },
            {
                title: "Roles",
                href: "/{orgId}/settings/access/roles"
            }
        ]
    },
    {
        title: "Shareable Links",
        href: "/{orgId}/settings/share-links",
        icon: <LinkIcon className="h-4 w-4" />
    },
    {
        title: "Settings",
        href: "/{orgId}/settings/general",
        icon: <Settings className="h-4 w-4" />
    }
]; 