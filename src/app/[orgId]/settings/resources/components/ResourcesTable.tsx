"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ResourcesDataTable } from "./ResourcesDataTable";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
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
    ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@app/api";
import CreateResourceForm from "./CreateResourceForm";
import { useState } from "react";
import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import { set } from "zod";
import { formatAxiosError } from "@app/lib/utils";
import { useToast } from "@app/hooks/useToast";

export type ResourceRow = {
    id: number;
    name: string;
    orgId: string;
    domain: string;
    site: string;
    siteId: string;
    hasAuth: boolean;
};

type ResourcesTableProps = {
    resources: ResourceRow[];
    orgId: string;
};

export default function SitesTable({ resources, orgId }: ResourcesTableProps) {
    const router = useRouter();

    const { toast } = useToast();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
                    description: formatAxiosError(e, "Error deleting resource"),
                });
            })
            .then(() => {
                router.refresh();
                setIsDeleteModalOpen(false);
            });
    };

    const columns: ColumnDef<ResourceRow>[] = [
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
                    <Button variant="outline">
                        <Link
                            href={`/${resourceRow.orgId}/settings/sites/${resourceRow.siteId}`}
                        >
                            {resourceRow.site}
                        </Link>
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
        },
        {
            accessorKey: "domain",
            header: "Full URL",
            cell: ({ row }) => {
                const resourceRow = row.original;
                return (
                    <div className="flex items-center">
                        <Link
                            href={resourceRow.domain}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline mr-2"
                        >
                            {resourceRow.domain}
                        </Link>
                        <Button
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                                navigator.clipboard.writeText(
                                    resourceRow.domain,
                                );
                                const originalIcon = document.querySelector(
                                    `#icon-${resourceRow.id}`,
                                );
                                if (originalIcon) {
                                    originalIcon.classList.add("hidden");
                                }
                                const checkIcon = document.querySelector(
                                    `#check-icon-${resourceRow.id}`,
                                );
                                if (checkIcon) {
                                    checkIcon.classList.remove("hidden");
                                    setTimeout(() => {
                                        checkIcon.classList.add("hidden");
                                        if (originalIcon) {
                                            originalIcon.classList.remove(
                                                "hidden",
                                            );
                                        }
                                    }, 2000);
                                }
                            }}
                        >
                            <Copy
                                id={`icon-${resourceRow.id}`}
                                className="h-4 w-4"
                            />
                            <Check
                                id={`check-icon-${resourceRow.id}`}
                                className="hidden text-green-500 h-4 w-4"
                            />
                            <span className="sr-only">Copy domain</span>
                        </Button>
                    </div>
                );
            },
        },
        {
            accessorKey: "hasAuth",
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
                        {resourceRow.hasAuth ? (
                            <span className="text-green-500 flex items-center space-x-2">
                                <ShieldCheck className="w-4 h-4" />
                                <span>Protected</span>
                            </span>
                        ) : (
                            <span className="text-yellow-500 flex items-center space-x-2">
                                <ShieldOff className="w-4 h-4" />
                                <span>Not Protected</span>
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const router = useRouter();

                const resourceRow = row.original;

                return (
                    <>
                        <div className="flex items-center justify-end">
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
                                        <Link
                                            href={`/${resourceRow.orgId}/settings/resources/${resourceRow.id}`}
                                        >
                                            View settings
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <button
                                            onClick={() => {
                                                setSelectedResource(
                                                    resourceRow,
                                                );
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
                                href={`/${resourceRow.orgId}/settings/resources/${resourceRow.id}`}
                            >
                                <Button variant={"gray"} className="ml-2">
                                    Edit
                                    <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </>
                );
            },
        },
    ];

    return (
        <>
            <CreateResourceForm
                open={isCreateModalOpen}
                setOpen={setIsCreateModalOpen}
            />

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
                addResource={() => {
                    setIsCreateModalOpen(true);
                }}
            />
        </>
    );
}
