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
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@app/components/ui/dropdown-menu";
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
                <Badge variant="outline" className="text-md font-bold">
                    {orgName}
                </Badge>

                <div className="flex items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-medium">
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
                                            <p className="text-sm font-medium leading-none">
                                                {name}
                                            </p>
                                        )}
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem>Profile</DropdownMenuItem>
                                    <DropdownMenuItem>Log out</DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </>
    );
}
