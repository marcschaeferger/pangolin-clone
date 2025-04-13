"use client";

import Link from "next/link";
import { useEnvContext } from "@app/hooks/useEnvContext";
import Image from "next/image";

interface HeaderProps {
    orgId?: string;
    orgs?: any;
}

export function Header({ orgId, orgs }: HeaderProps) {
    const { env } = useEnvContext();

    return (
        <div className="flex items-center justify-between w-full">
            <Link href="/" className="flex items-center space-x-2">
                <Image
                    src="/logo/pangolin_orange.svg"
                    alt="Pangolin Logo"
                    width={34}
                    height={34}
                />
                <span className="font-[Space_Grotesk] font-bold text-2xl text-neutral-500">Pangolin</span>
            </Link>
        </div>
    );
}

export default Header;
