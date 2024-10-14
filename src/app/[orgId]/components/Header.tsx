"use client";

import { Avatar, AvatarFallback } from "@app/components/ui/avatar";
import { Badge } from "@app/components/ui/badge";
import { Button } from "@app/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@app/components/ui/dropdown-menu";
import { Separator } from "@app/components/ui/separator";
import Link from "next/link";

type HeaderProps = {
    name?: string;
    email: string;
    orgName: string;
};

export default function Header({ email, orgName, name }: HeaderProps) {
    function getInitials() {
        if (name) {
            const [firstName, lastName] = name.split(" ");
            return `${firstName[0]}${lastName[0]}`;
        }
        return email.substring(0, 2).toUpperCase();
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <Badge variant="default" className="text-md font-bold">
                        {orgName}
                    </Badge>

                    <div className="hidden md:block">
                        <div className="flex items-center gap-4 ml-4">
                            <Link
                                href="/docs"
                                className="text-primary hover:text-primary"
                            >
                                Documentation
                            </Link>
                            <Link
                                href="/support"
                                className="text-primary hover:text-primary"
                            >
                                Support
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Make the text truncate on smaller screens */}
                    <span className="text-lg font-medium truncate max-w-[150px] md:max-w-none">
                        {name || email}
                    </span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="relative h-10 w-10 rounded-full"
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback>
                                        {getInitials()}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-56"
                            align="end"
                            forceMount
                        >
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    {name && (
                                        <p className="text-sm font-medium leading-none truncate">
                                            {name}
                                        </p>
                                    )}
                                    <p className="text-xs leading-none text-muted-foreground truncate">
                                        {email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <Link href="/profile"><DropdownMenuItem>Profile</DropdownMenuItem></Link>
                                <DropdownMenuItem>Log out</DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </>
    );
}
