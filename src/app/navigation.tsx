import { SidebarNavItem } from "@app/components/SidebarNav";
import {
    Home,
    Settings,
    Users,
    Link as LinkIcon,
    Waypoints,
    Combine,
    Fingerprint
} from "lucide-react";

export const rootNavItems: SidebarNavItem[] = [
    {
        title: "Home",
        href: "/",
        icon: <Home className="h-4 w-4" />
    }
];

export const orgNavItems: SidebarNavItem[] = [
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
        autoExpand: true,
        children: [
            {
                title: "Users",
                href: "/{orgId}/settings/access/users",
                children: [
                    {
                        title: "Invitations",
                        href: "/{orgId}/settings/access/invitations"
                    }
                ]
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

export const adminNavItems: SidebarNavItem[] = [
    {
        title: "All Users",
        href: "/admin/users",
        icon: <Users className="h-4 w-4" />
    },
    {
        title: "Identity Providers",
        href: "/admin/idp",
        icon: <Fingerprint className="h-4 w-4" />
    }
];
