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
import CreateRoleForm from "./CreateRoleForm";
import DeleteRoleForm from "./DeleteRoleForm";

export type RoleRow = Role;

type RolesTableProps = {
    roles: RoleRow[];
};

export default function UsersTable({ roles: r }: RolesTableProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [roles, setRoles] = useState<RoleRow[]>(r);

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
                                            Delete Role
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

    return (
        <>
            <CreateRoleForm
                open={isCreateModalOpen}
                setOpen={setIsCreateModalOpen}
                afterCreate={async (role) => {
                    setRoles((prev) => [...prev, role]);
                }}
            />

            {roleToRemove && (
                <DeleteRoleForm
                    open={isDeleteModalOpen}
                    setOpen={setIsDeleteModalOpen}
                    roleToDelete={roleToRemove}
                    afterDelete={() => {
                        setRoles((prev) =>
                            prev.filter((r) => r.roleId !== roleToRemove.roleId)
                        );
                        setUserToRemove(null);
                    }}
                />
            )}

            <RolesDataTable
                columns={columns}
                data={roles}
                addRole={() => {
                    setIsCreateModalOpen(true);
                }}
            />
        </>
    );
}
