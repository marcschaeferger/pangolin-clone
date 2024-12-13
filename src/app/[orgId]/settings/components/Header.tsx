"use client";

import { createApiClient } from "@app/api";
import { Avatar, AvatarFallback } from "@app/components/ui/avatar";
import { Button } from "@app/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@app/components/ui/command";
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
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@app/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@app/components/ui/select";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { useToast } from "@app/hooks/useToast";
import { cn, formatAxiosError } from "@app/lib/utils";
import { ListOrgsResponse } from "@server/routers/org";
import { Check, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type HeaderProps = {
    name?: string;
    email: string;
    orgId: string;
    orgs: ListOrgsResponse["orgs"];
};

export default function Header({ email, orgId, name, orgs }: HeaderProps) {
    const { toast } = useToast();

    const [open, setOpen] = useState(false);

    const router = useRouter();

    const api = createApiClient(useEnvContext());

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
                                    Logout
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

                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="lg"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full md:w-[200px] h-12 px-3 py-4 bg-neutral hover:bg-neutral"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex flex-col items-start">
                                        <span className="font-bold text-sm">
                                            Organization
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            {orgId
                                                ? orgs.find(
                                                      (org) =>
                                                          org.orgId === orgId,
                                                  )?.name
                                                : "Select organization..."}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                                </div>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="[100px] md:w-[180px] p-0">
                            <Command>
                                <CommandInput placeholder="Search..." />
                                <CommandEmpty>
                                    No organization found.
                                </CommandEmpty>
                                <CommandGroup className="[50px]">
                                    <CommandList>
                                        {orgs.map((org) => (
                                            <CommandItem
                                                key={org.orgId}
                                                onSelect={(currentValue) => {
                                                    router.push(
                                                        `/${org.orgId}/settings`,
                                                    );
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        orgId === org.orgId
                                                            ? "opacity-100"
                                                            : "opacity-0",
                                                    )}
                                                />
                                                {org.name}
                                            </CommandItem>
                                        ))}
                                    </CommandList>
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </>
    );
}
