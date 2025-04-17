"use client";

import { ColumnDef } from "@tanstack/react-table";
import { IdpDataTable } from "./AdminIdpDataTable";
import { Button } from "@app/components/ui/button";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import { toast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { Badge } from "@app/components/ui/badge";

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

    const deleteIdp = async (idpId: number) => {
        try {
            await api.delete(`/idp/${idpId}`);
            toast({
                title: "Success",
                description: "Identity provider deleted successfully"
            });
            // Refresh the page to update the list
            window.location.reload();
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
                    <Badge variant="secondary">
                        {getTypeDisplay(type)}
                    </Badge>
                );
            }
        },
        {
            accessorKey: "orgCount",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        Organization Policies
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            }
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const idp = row.original;
                return (
                    <div className="flex items-center justify-end">
                        <Button
                            variant="outline"
                            className="ml-2"
                            onClick={() => {
                                setSelectedIdp(idp);
                                setIsDeleteModalOpen(true);
                            }}
                        >
                            Delete
                        </Button>
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
