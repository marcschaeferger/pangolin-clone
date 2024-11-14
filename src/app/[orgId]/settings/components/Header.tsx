"use client";

import api from "@app/api";
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
import { useToast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/utils";
import { ListOrgsResponse } from "@server/routers/org";
import Link from "next/link";
import { useRouter } from "next/navigation";

type HeaderProps = {
    name?: string;
    email: string;
    orgName: string;
    orgs: ListOrgsResponse["orgs"];
};

export default function Header({ email, orgName, name, orgs }: HeaderProps) {
    const { toast } = useToast();

    const router = useRouter();

    function getInitials() {
        if (name) {
            const [firstName, lastName] = name.split(" ");
            return `${firstName[0]}${lastName[0]}`;
        }
        return email.substring(0, 2).toUpperCase();
    }

    function logout() {
        api.post("/auth/logout")
            .catch((e) => {
                console.error("Error logging out", e);
                toast({
                    title: "Error logging out",
                    description: formatAxiosError(e, "Error logging out"),
                });
            })
            .then(() => {
                router.push("/auth/login");
            });
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
                                <DropdownMenuItem onClick={logout}>
                                    Log out
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <span className="truncate max-w-[150px] md:max-w-none font-medium">
                        {name || email}
                    </span>
                </div>

                <div className="flex items-center">
                    <div className="hidden md:block">
                        <div className="flex items-center gap-4 mr-4">
                            <Link
                                href="/docs"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Documentation
                            </Link>
                            <Link
                                href="/support"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Support
                            </Link>
                        </div>
                    </div>

                    <Select
                        defaultValue={orgName}
                        onValueChange={(val) => {
                            router.push(`/${val}/settings`);
                        }}
                    >
                        <SelectTrigger className="w-[100px] md:w-[180px]">
                            <SelectValue placeholder="Select an org" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {orgs.map((org) => (
                                    <SelectItem
                                        value={org.name}
                                        key={org.orgId}
                                    >
                                        {org.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </>
    );
}
