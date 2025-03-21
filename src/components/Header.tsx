"use client";

import { Button } from "@app/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator
} from "@app/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@app/components/ui/popover";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { cn } from "@app/lib/cn";
import { ListOrgsResponse } from "@server/routers/org";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUserContext } from "@app/hooks/useUserContext";
import ProfileIcon from "./ProfileIcon";
import SupporterStatus from "./SupporterStatus";

type HeaderProps = {
    orgId?: string;
    orgs?: ListOrgsResponse["orgs"];
};

export function Header({ orgId, orgs }: HeaderProps) {
    const { user, updateUser } = useUserContext();

    const [open, setOpen] = useState(false);

    const router = useRouter();

    const { env } = useEnvContext();

    return (
        <>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ProfileIcon />

                    <div className="hidden md:block">
                        <SupporterStatus />
                    </div>
                </div>

                <div className="flex items-center">
                    <div className="hidden md:block">
                        <div className="flex items-center gap-4 mr-4">
                            <Link
                                href="https://docs.fossorial.io/Pangolin/overview"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Documentation
                            </Link>
                            <a
                                href="mailto:support@fossorial.io"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Support
                            </a>
                        </div>
                    </div>

                    {orgs && (
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
                                                    ? orgs?.find(
                                                          (org) =>
                                                              org.orgId ===
                                                              orgId
                                                      )?.name
                                                    : "None selected"}
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
                                        No organizations found.
                                    </CommandEmpty>
                                    {(!env.flags.disableUserCreateOrg ||
                                        user.serverAdmin) && (
                                        <>
                                            <CommandGroup heading="Create">
                                                <CommandList>
                                                    <CommandItem
                                                        onSelect={(
                                                            currentValue
                                                        ) => {
                                                            router.push(
                                                                "/setup"
                                                            );
                                                        }}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        New Organization
                                                    </CommandItem>
                                                </CommandList>
                                            </CommandGroup>
                                            <CommandSeparator />
                                        </>
                                    )}
                                    <CommandGroup heading="Organizations">
                                        <CommandList>
                                            {orgs.map((org) => (
                                                <CommandItem
                                                    key={org.orgId}
                                                    onSelect={(
                                                        currentValue
                                                    ) => {
                                                        router.push(
                                                            `/${org.orgId}/settings`
                                                        );
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            orgId === org.orgId
                                                                ? "opacity-100"
                                                                : "opacity-0"
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
                    )}
                </div>
            </div>
        </>
    );
}

export default Header;
