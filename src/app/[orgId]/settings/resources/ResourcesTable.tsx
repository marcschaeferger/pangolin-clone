"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ResourcesDataTable } from "./ResourcesDataTable";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@app/components/ui/dropdown-menu";
import { Button } from "@app/components/ui/button";
import {
    Copy,
    ArrowRight,
    ArrowUpDown,
    MoreHorizontal,
    Check,
    ArrowUpRight,
    ShieldOff,
    ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import { formatAxiosError } from "@app/lib/api";
import { toast } from "@app/hooks/useToast";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import CopyToClipboard from "@app/components/CopyToClipboard";
import { Switch } from "@app/components/ui/switch";
import { AxiosResponse } from "axios";
import { UpdateResourceResponse } from "@server/routers/resource";

export type ResourceRow = {
    id: number;
    name: string;
    orgId: string;
    domain: string;
    site: string;
    siteId: string;
    authState: string;
    http: boolean;
    protocol: string;
    proxyPort: number | null;
    enabled: boolean;
};

type ResourcesTableProps = {
    resources: ResourceRow[];
    orgId: string;
};

export default function SitesTable({ resources, orgId }: ResourcesTableProps) {
    const router = useRouter();

    const api = createApiClient(useEnvContext());

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedResource, setSelectedResource] =
        useState<ResourceRow | null>();

    const deleteResource = (resourceId: number) => {
        api.delete(`/resource/${resourceId}`)
            .catch((e) => {
                console.error("Error deleting resource", e);
                toast({
                    variant: "destructive",
                    title: "Error deleting resource",
                    description: formatAxiosError(e, "Error deleting resource")
                });
            })
            .then(() => {
                router.refresh();
                setIsDeleteModalOpen(false);
            });
    };

    async function toggleResourceEnabled(val: boolean, resourceId: number) {
        const res = await api
            .post<AxiosResponse<UpdateResourceResponse>>(
                `resource/${resourceId}`,
                {
                    enabled: val
                }
            )
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to toggle resource",
                    description: formatAxiosError(
                        e,
                        "An error occurred while updating the resource"
                    )
                });
            });
    }

    const columns: ColumnDef<ResourceRow>[] = [
        {
            accessorKey: "dots",
            header: "",
            cell: ({ row }) => {
                const resourceRow = row.original;
                const router = useRouter();

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
                                href={`/${resourceRow.orgId}/settings/resources/${resourceRow.id}`}
                            >
                                <DropdownMenuItem>
                                    View settings
                                </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelectedResource(resourceRow);
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
            accessorKey: "site",
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
            cell: ({ row }) => {
                const resourceRow = row.original;
                return (
                    <Link
                        href={`/${resourceRow.orgId}/settings/sites/${resourceRow.siteId}`}
                    >
                        <Button variant="outline">
                            {resourceRow.site}
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                );
            }
        },
        {
            accessorKey: "protocol",
            header: "Protocol",
            cell: ({ row }) => {
                const resourceRow = row.original;
                return <span>{resourceRow.protocol.toUpperCase()}</span>;
            }
        },
        {
            accessorKey: "domain",
            header: "Access",
            cell: ({ row }) => {
                const resourceRow = row.original;
                return (
                    <div>
                        {!resourceRow.http ? (
                            <CopyToClipboard
                                text={resourceRow.proxyPort!.toString()}
                                isLink={false}
                            />
                        ) : (
                            <CopyToClipboard
                                text={resourceRow.domain}
                                isLink={true}
                            />
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: "authState",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() =>
                            column.toggleSorting(column.getIsSorted() === "asc")
                        }
                    >
                        Authentication
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const resourceRow = row.original;
                return (
                    <div>
                        {resourceRow.authState === "protected" ? (
                            <span className="text-green-500 flex items-center space-x-2">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Protected</span>
                            </span>
                        ) : resourceRow.authState === "not_protected" ? (
                            <span className="text-yellow-500 flex items-center space-x-2">
                                <ShieldOff className="w-4 h-4" />
                                <span>Not Protected</span>
                            </span>
                        ) : (
                            <span>-</span>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: "enabled",
            header: "Enabled",
            cell: ({ row }) => (
                <Switch
                    defaultChecked={row.original.enabled}
                    onCheckedChange={(val) =>
                        toggleResourceEnabled(val, row.original.id)
                    }
                />
            )
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const resourceRow = row.original;
                return (
                    <div className="flex items-center justify-end">
                        <Link
                            href={`/${resourceRow.orgId}/settings/resources/${resourceRow.id}`}
                        >
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
            {selectedResource && (
                <ConfirmDeleteDialog
                    open={isDeleteModalOpen}
                    setOpen={(val) => {
                        setIsDeleteModalOpen(val);
                        setSelectedResource(null);
                    }}
                    dialog={
                        <div>
                            <p className="mb-2">
                                Are you sure you want to remove the resource{" "}
                                <b>
                                    {selectedResource?.name ||
                                        selectedResource?.id}
                                </b>{" "}
                                from the organization?
                            </p>

                            <p className="mb-2">
                                Once removed, the resource will no longer be
                                accessible. All targets attached to the resource
                                will be removed.
                            </p>

                            <p>
                                To confirm, please type the name of the resource
                                below.
                            </p>
                        </div>
                    }
                    buttonText="Confirm Delete Resource"
                    onConfirm={async () => deleteResource(selectedResource!.id)}
                    string={selectedResource.name}
                    title="Delete Resource"
                />
            )}

            <ResourcesDataTable
                columns={columns}
                data={resources}
                createResource={() => {
                    router.push(`/${orgId}/settings/resources/create`);
                }}
            />
        </>
    );
}
