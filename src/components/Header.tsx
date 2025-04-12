"use client";

import Link from "next/link";
import { useEnvContext } from "@app/hooks/useEnvContext";

interface HeaderProps {
    orgId?: string;
    orgs?: any;
}

export function Header({ orgId, orgs }: HeaderProps) {
    const { env } = useEnvContext();

    return (
        <div className="flex items-center justify-between w-full">
            <Link href="/" className="flex items-center space-x-2">
                <span className="font-bold">Pangolin</span>
            </Link>
        </div>
    );
}

export default Header;
