"use client";

import { ColumnDef } from "@tanstack/react-table";
import { IdpDataTable } from "./AdminIdpDataTable";
import { Button } from "@app/components/ui/button";
import { ArrowRight, ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import { toast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { Badge } from "@app/components/ui/badge";
import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@app/components/ui/dropdown-menu";
import Link from "next/link";

export type IdpRow = {
    idpId: number;
    name: string;
    type: string;
    orgCount: number;
};

type Props = {
    idps: IdpRow[];
};

export default function IdpTable({ idps }: Props) {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedIdp, setSelectedIdp] = useState<IdpRow | null>(null);
    const api = createApiClient(useEnvContext());
    const router = useRouter();

    const deleteIdp = async (idpId: number) => {
        try {
            await api.delete(`/idp/${idpId}`);
            toast({
                title: "Success",
                description: "Identity provider deleted successfully"
            });
            setIsDeleteModalOpen(false);
            router.refresh();
        } catch (e) {
            toast({
                title: "Error",
                description: formatAxiosError(e),
                variant: "destructive"
            });
        }
    };

    const getTypeDisplay = (type: string) => {
        switch (type) {
            case "oidc":
                return "OAuth2/OIDC";
            default:
                return type;
        }
    };

    const columns: ColumnDef<IdpRow>[] = [
        {
            id: "dots",
            cell: ({ row }) => {
                const r = row.original;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <Link
                                className="block w-full"
                                href={`/admin/idp/${r.idpId}/general`}
                            >
                                <DropdownMenuItem>
                                    View settings
                                </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelectedIdp(r);
                                    setIsDeleteModalOpen(true);
                                }}
                            >
                                <span className="text-red-500">Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            }
        },
        {
            accessorKey: "idpId",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        ID
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
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
            accessorKey: "type",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        Type
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const type = row.original.type;
                return (
                    <Badge variant="secondary">{getTypeDisplay(type)}</Badge>
                );
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const siteRow = row.original;
                return (
                    <div className="flex items-center justify-end">
                        <Link href={`/admin/idp/${siteRow.idpId}/general`}>
                            <Button variant={"outlinePrimary"} className="ml-2">
                                Edit
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                );
            }
        }
    ];

    return (
        <>
            {selectedIdp && (
                <ConfirmDeleteDialog
                    open={isDeleteModalOpen}
                    setOpen={(val) => {
                        setIsDeleteModalOpen(val);
                        setSelectedIdp(null);
                    }}
                    dialog={
                        <div className="space-y-4">
                            <p>
                                Are you sure you want to permanently delete the
                                identity provider <b>{selectedIdp.name}</b>?
                            </p>
                            <p>
                                <b>
                                    This will remove the identity provider and
                                    all associated configurations. Users who
                                    authenticate through this provider will no
                                    longer be able to log in.
                                </b>
                            </p>
                            <p>
                                To confirm, please type the name of the identity
                                provider below.
                            </p>
                        </div>
                    }
                    buttonText="Confirm Delete Identity Provider"
                    onConfirm={async () => deleteIdp(selectedIdp.idpId)}
                    string={selectedIdp.name}
                    title="Delete Identity Provider"
                />
            )}

            <IdpDataTable columns={columns} data={idps} />
        </>
    );
}
