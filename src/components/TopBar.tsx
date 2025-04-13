"use client";

import ProfileIcon from "@app/components/ProfileIcon";
import Link from "next/link";

interface TopBarProps {
    orgId?: string;
    orgs?: any;
}

export function TopBar({ orgId, orgs }: TopBarProps) {
    return (
        <div className="flex items-center justify-end md:justify-between w-full h-full">
            <div className="hidden md:flex items-center space-x-4">
                <Link
                    href="https://docs.fossorial.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    Documentation
                </Link>
                <Link
                    href="mailto:support@fossorial.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    Support
                </Link>
            </div>
            <div>
                <ProfileIcon />
            </div>
        </div>
    );
}
