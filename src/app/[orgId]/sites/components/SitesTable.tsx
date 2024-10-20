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
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@app/api";

export type SiteRow = {
    id: number;
    nice: string;
    name: string;
    mbIn: number;
    mbOut: number;
    orgId: string;
};

export const columns: ColumnDef<SiteRow>[] = [
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
        header: "MB In",
    },
    {
        accessorKey: "mbOut",
        header: "MB Out",
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const router = useRouter();

            const siteRow = row.original;

            const deleteSite = (siteId: number) => {
                api.delete(`/site/${siteId}`)
                    .catch((e) => {
                        console.error("Error deleting site", e);
                    })
                    .then(() => {
                        router.refresh();
                    });
            }

            return (
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
                                href={`/${siteRow.orgId}/sites/${siteRow.id}`}
                            >
                                View settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <button onClick={() => deleteSite(siteRow.id)} className="text-red-600 hover:text-red-800 hover:underline cursor-pointer">Delete</button>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];

type SitesTableProps = {
    sites: SiteRow[];
    orgId: string;
};

export default function SitesTable({ sites, orgId }: SitesTableProps) {
    const router = useRouter();

    return (
        <SitesDataTable
            columns={columns}
            data={sites}
            addSite={() => {
                router.push(`/${orgId}/sites/create`);
            }}
        />
    );
}
