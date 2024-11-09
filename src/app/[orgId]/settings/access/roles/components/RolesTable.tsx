"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@app/components/ui/dropdown-menu";
import { Button } from "@app/components/ui/button";
import { ArrowUpDown, Crown, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import api from "@app/api";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { useToast } from "@app/hooks/useToast";
import { RolesDataTable } from "./RolesDataTable";
import { Role } from "@server/db/schema";

export type RoleRow = Role;

type RolesTableProps = {
    roles: RoleRow[];
};

export default function UsersTable({ roles }: RolesTableProps) {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [roleToRemove, setUserToRemove] = useState<RoleRow | null>(null);

    const { org } = useOrgContext();
    const { toast } = useToast();

    const columns: ColumnDef<RoleRow>[] = [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
        },
        {
            accessorKey: "description",
            header: "Description",
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const roleRow = row.original;

                return (
                    <>
                        {!roleRow.isAdmin && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                    >
                                        <span className="sr-only">
                                            Open menu
                                        </span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem>
                                        <button
                                            className="text-red-600 hover:text-red-800"
                                            onClick={() => {
                                                setIsDeleteModalOpen(true);
                                                setUserToRemove(roleRow);
                                            }}
                                        >
                                            Remove User
                                        </button>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </>
                );
            },
        },
    ];

    async function removeRole() {
        if (roleToRemove) {
            const res = await api
                .delete(`/org/${org!.org.orgId}/role/${roleToRemove.roleId}`)
                .catch((e) => {
                    toast({
                        variant: "destructive",
                        title: "Failed to remove role",
                        description:
                            e.message ??
                            "An error occurred while removing the role.",
                    });
                });

            if (res && res.status === 200) {
                toast({
                    variant: "default",
                    title: "Role removed",
                    description: `The role ${roleToRemove.name} has been removed from the organization.`,
                });
            }
        }
        setIsDeleteModalOpen(false);
    }

    return (
        <>
            <ConfirmDeleteDialog
                open={isDeleteModalOpen}
                setOpen={(val) => {
                    setIsDeleteModalOpen(val);
                    setUserToRemove(null);
                }}
                dialog={
                    <div>
                        <p className="mb-2">
                            Are you sure you want to remove the role{" "}
                            <b>{roleToRemove?.name}</b> from the organization?
                        </p>

                        <p className="mb-2">
                            You cannot undo this action. Please select a new
                            role to move existing users to after deletion.
                        </p>

                        <p>
                            To confirm, please type the name of the role below.
                        </p>
                    </div>
                }
                buttonText="Confirm remove role"
                onConfirm={removeRole}
                string={roleToRemove?.name ?? ""}
                title="Remove role from organization"
            />

            <RolesDataTable columns={columns} data={roles} />
        </>
    );
}
