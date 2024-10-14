"use client";

import { Avatar, AvatarFallback } from "@app/components/ui/avatar";
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
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@app/components/ui/select";
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
                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="relative h-10 w-10 rounded-full"
                            >
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback>
                                        {getInitials()}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-56"
                            align="start"
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
                                <DropdownMenuItem>Profile</DropdownMenuItem>
                                <DropdownMenuItem>Log out</DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <span className="truncate max-w-[150px] md:max-w-none">
                        {name || email}
                    </span>
                </div>

                <div className="flex items-center">
                    <div className="hidden md:block">
                        <div className="flex items-center gap-4 mr-4">
                            <Link
                                href="/docs"
                                className="text-muted-foreground hover:text-black"
                            >
                                Documentation
                            </Link>
                            <Link
                                href="/support"
                                className="text-muted-foreground hover:text-black"
                            >
                                Support
                            </Link>
                        </div>
                    </div>

                    <Select defaultValue={orgName}>
                        <SelectTrigger className="w-[100px] md:w-[180px]">
                            <SelectValue placeholder="Select an org" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value={orgName}>
                                    {orgName}
                                </SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </>
    );
}
