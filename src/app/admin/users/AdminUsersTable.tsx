"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UsersDataTable } from "./AdminUsersDataTable";
import { Button } from "@app/components/ui/button";
import { ArrowRight, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import { toast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";

export type GlobalUserRow = {
    id: string;
    email: string;
    dateCreated: string;
};

type Props = {
    users: GlobalUserRow[];
};

export default function UsersTable({ users }: Props) {
    const router = useRouter();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selected, setSelected] = useState<GlobalUserRow | null>(null);
    const [rows, setRows] = useState<GlobalUserRow[]>(users);

    const api = createApiClient(useEnvContext());

    const deleteUser = (id: string) => {
        api.delete(`/user/${id}`)
            .catch((e) => {
                console.error("Error deleting user", e);
                toast({
                    variant: "destructive",
                    title: "Error deleting user",
                    description: formatAxiosError(e, "Error deleting user")
                });
            })
            .then(() => {
                router.refresh();
                setIsDeleteModalOpen(false);

                const newRows = rows.filter((row) => row.id !== id);

                setRows(newRows);
            });
    };

    const columns: ColumnDef<GlobalUserRow>[] = [
        {
            accessorKey: "id",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        ID
                    </Button>
                );
            }
        },
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
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const r = row.original;
                return (
                    <>
                        <div className="flex items-center justify-end">
                            <Button
                                variant={"outlinePrimary"}
                                className="ml-2"
                                onClick={() => {
                                    setSelected(r);
                                    setIsDeleteModalOpen(true);
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    </>
                );
            }
        }
    ];

    return (
        <>
            {selected && (
                <ConfirmDeleteDialog
                    open={isDeleteModalOpen}
                    setOpen={(val) => {
                        setIsDeleteModalOpen(val);
                        setSelected(null);
                    }}
                    dialog={
                        <div className="space-y-4">
                            <p>
                                Are you sure you want to permanently delete{" "}
                                <b>{selected?.email || selected?.id}</b> from
                                the server?
                            </p>

                            <p>
                                <b>
                                    The user will be removed from all
                                    organizations and be completely removed from
                                    the server.
                                </b>
                            </p>

                            <p>
                                To confirm, please type the email of the user
                                below.
                            </p>
                        </div>
                    }
                    buttonText="Confirm Delete User"
                    onConfirm={async () => deleteUser(selected!.id)}
                    string={selected.email}
                    title="Delete User from Server"
                />
            )}

            <UsersDataTable columns={columns} data={rows} />
        </>
    );
}
