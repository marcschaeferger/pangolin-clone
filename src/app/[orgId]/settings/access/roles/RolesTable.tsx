"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@app/components/ui/dropdown-menu";
import { Button } from "@app/components/ui/button";
import { ArrowUpDown, Crown, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { toast } from "@app/hooks/useToast";
import { RolesDataTable } from "./RolesDataTable";
import { Role } from "@server/db";
import CreateRoleForm from "./CreateRoleForm";
import DeleteRoleForm from "./DeleteRoleForm";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";

export type RoleRow = Role;

type RolesTableProps = {
    roles: RoleRow[];
};

export default function UsersTable({ roles: r }: RolesTableProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [roles, setRoles] = useState<RoleRow[]>(r);

    const [roleToRemove, setUserToRemove] = useState<RoleRow | null>(null);

    const api = createApiClient(useEnvContext());

    const { org } = useOrgContext();

    const columns: ColumnDef<RoleRow>[] = [
        {
            id: "actions",
            cell: ({ row }) => {
                const roleRow = row.original;

                return (
                    <>
                        <div>
                            {roleRow.isAdmin && (
                                <MoreHorizontal className="h-4 w-4 opacity-0" />
                            )}
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
                                        <DropdownMenuItem
                                            onClick={() => {
                                                setIsDeleteModalOpen(true);
                                                setUserToRemove(roleRow);
                                            }}
                                        >
                                            <span className="text-red-500">
                                                Delete Role
                                            </span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </>
                );
            }
        },
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
            }
        },
        {
            accessorKey: "description",
            header: "Description"
        }
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
                createRole={() => {
                    setIsCreateModalOpen(true);
                }}
            />
        </>
    );
}
