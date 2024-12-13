"use client";

import { ColumnDef } from "@tanstack/react-table";
import { SitesDataTable } from "./SitesDataTable";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@app/components/ui/dropdown-menu";
import { Button } from "@app/components/ui/button";
import { ArrowRight, ArrowUpDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AxiosResponse } from "axios";
import { useState } from "react";
import CreateSiteForm from "./CreateSiteForm";
import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import { useToast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/utils";
import { createApiClient } from "@app/api";
import { useEnvContext } from "@app/hooks/useEnvContext";

export type SiteRow = {
    id: number;
    nice: string;
    name: string;
    mbIn: string;
    mbOut: string;
    orgId: string;
    type: "newt" | "wireguard";
};

type SitesTableProps = {
    sites: SiteRow[];
    orgId: string;
};

export default function SitesTable({ sites, orgId }: SitesTableProps) {
    const router = useRouter();

    const { toast } = useToast();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedSite, setSelectedSite] = useState<SiteRow | null>(null);

    const api = createApiClient(useEnvContext());

    const callApi = async () => {
        const res = await api.put<AxiosResponse<any>>(`/newt`);
        console.log(res);
    };

    const deleteSite = (siteId: number) => {
        api.delete(`/site/${siteId}`)
            .catch((e) => {
                console.error("Error deleting site", e);
                toast({
                    variant: "destructive",
                    title: "Error deleting site",
                    description: formatAxiosError(e, "Error deleting site"),
                });
            })
            .then(() => {
                router.refresh();
                setIsDeleteModalOpen(false);
            });
    };

    const columns: ColumnDef<SiteRow>[] = [
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
            accessorKey: "nice",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        Site
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
        },
        {
            accessorKey: "mbIn",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        Data In
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
        },
        {
            accessorKey: "mbOut",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        Data Out
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
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
                        Connection Type
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const originalRow = row.original;

                if (originalRow.type === "newt") {
                    return (
                        <div className="flex items-center space-x-2">
                            <span>Newt</span>
                        </div>
                    );
                }

                if (originalRow.type === "wireguard") {
                    return (
                        <div className="flex items-center space-x-2">
                            <span>WireGuard</span>
                        </div>
                    );
                }
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const router = useRouter();

                const siteRow = row.original;

                return (
                    <div className="flex items-center justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                    <Link
                                        href={`/${siteRow.orgId}/settings/sites/${siteRow.nice}`}
                                    >
                                        View settings
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <button
                                        onClick={() => {
                                            setSelectedSite(siteRow);
                                            setIsDeleteModalOpen(true);
                                        }}
                                        className="text-red-500"
                                    >
                                        Delete
                                    </button>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Link
                            href={`/${siteRow.orgId}/settings/sites/${siteRow.nice}`}
                        >
                            <Button variant={"gray"} className="ml-2">
                                Edit
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                );
            },
        },
    ];

    return (
        <>
            <CreateSiteForm
                open={isCreateModalOpen}
                setOpen={setIsCreateModalOpen}
            />

            {selectedSite && (
                <ConfirmDeleteDialog
                    open={isDeleteModalOpen}
                    setOpen={(val) => {
                        setIsDeleteModalOpen(val);
                        setSelectedSite(null);
                    }}
                    dialog={
                        <div className="space-y-4">
                            <p>
                                Are you sure you want to remove the site{" "}
                                <b>{selectedSite?.name || selectedSite?.id}</b>{" "}
                                from the organization?
                            </p>

                            <p>
                                Once removed, the site will no longer be
                                accessible.{" "}
                                <b>
                                    All resources and targets associated with
                                    the site will also be removed.
                                </b>
                            </p>

                            <p>
                                To confirm, please type the name of the site
                                below.
                            </p>
                        </div>
                    }
                    buttonText="Confirm Delete Site"
                    onConfirm={async () => deleteSite(selectedSite!.id)}
                    string={selectedSite.name}
                    title="Delete Site"
                />
            )}

            <SitesDataTable
                columns={columns}
                data={sites}
                addSite={() => {
                    setIsCreateModalOpen(true);
                }}
            />
            {/* <button onClick={callApi}>Create Newt</button> */}
        </>
    );
}
