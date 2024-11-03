"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@app/components/ui/dropdown-menu";
import { Button } from "@app/components/ui/button";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { UsersDataTable } from "./UsersDataTable";
import { useState } from "react";
import InviteUserForm from "./InviteUserForm";

export type UserRow = {
    id: string;
    email: string;
};

export const columns: ColumnDef<UserRow>[] = [
    {
        accessorKey: "email",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() =>
                        column.toggleSorting(column.getIsSorted() === "asc")
                    }
                >
                    Email
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const userRow = row.original;

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit access</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];

type UsersTableProps = {
    users: UserRow[];
};

export default function UsersTable({ users }: UsersTableProps) {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    return (
        <>
            <InviteUserForm
                open={isInviteModalOpen}
                setOpen={setIsInviteModalOpen}
            />

            <UsersDataTable
                columns={columns}
                data={users}
                inviteUser={() => {
                    setIsInviteModalOpen(true);
                }}
            />
        </>
    );
}
