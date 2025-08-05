"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ResourceSessionsDataTable } from "./ResourceSessionsDataTable";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, LogOut } from "lucide-react";
import { useState } from "react";
import { InvalidateSessionDialog } from "./InvalidateSessionDialog";
import { toast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { useTranslations } from "next-intl";
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type ResourceSessionRow = {
    sessionId: string;
    resourceId: number;
    resourceName: string;
    expiresAt: number;
    sessionLength: number;
    doNotExtend: boolean;
    isRequestToken: boolean;
    userSessionId: string | null;
    username: string | null;
    email: string | null;
    authMethod: string;
};

type Props = {
    sessions: ResourceSessionRow[];
};

export default function ResourceSessionsTable({ sessions }: Props) {
    const t = useTranslations();

    const [isInvalidateModalOpen, setIsInvalidateModalOpen] = useState(false);
    const [selected, setSelected] = useState<ResourceSessionRow | null>(null);
    const [rows, setRows] = useState<ResourceSessionRow[]>(sessions);
    const [isLoading, setIsLoading] = useState(false);

    const api = createApiClient(useEnvContext());

    const invalidateSession = async (sessionId: string) => {
        setIsLoading(true);
        try {
            await api.delete(`/session/resource/${sessionId}`);
            setRows(prevRows => prevRows.filter(row => row.sessionId !== sessionId));
            toast({
                title: "Resource session invalidated",
                description: "The resource session has been successfully invalidated.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: formatAxiosError(error),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
            setIsInvalidateModalOpen(false);
            setSelected(null);
        }
    };

    const formatDateTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const formatDuration = (milliseconds: number) => {
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const isExpiringSoon = (expiresAt: number) => {
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        return expiresAt - Date.now() < oneHour;
    };

    const columns: ColumnDef<ResourceSessionRow>[] = [
        {
            accessorKey: "resourceName",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Resource
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="font-medium">{row.getValue("resourceName")}</div>
            ),
        },
        {
            accessorKey: "authMethod",
            header: "Auth Method",
            cell: ({ row }) => {
                const method = row.getValue("authMethod") as string;
                const variant = method === "Password" ? "default" : 
                              method === "Pincode" ? "secondary" :
                              method === "Whitelist" ? "outline" :
                              method === "Access Token" ? "destructive" :
                              method === "User Session" ? "success" : "default";
                return (
                    <Badge variant={variant as any}>
                        {method}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "username",
            header: "User",
            cell: ({ row }) => {
                const username = row.getValue("username") as string | null;
                const email = row.original.email;
                if (!username && !email) {
                    return <div className="text-sm text-muted-foreground">-</div>;
                }
                return (
                    <div>
                        <div className="text-sm font-medium">{username || "Unknown"}</div>
                        {email && <div className="text-xs text-muted-foreground">{email}</div>}
                    </div>
                );
            },
        },
        {
            accessorKey: "sessionLength",
            header: "Duration",
            cell: ({ row }) => (
                <div className="text-sm">{formatDuration(row.getValue("sessionLength"))}</div>
            ),
        },
        {
            accessorKey: "expiresAt",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Expires
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => {
                const expiresAt = row.getValue("expiresAt") as number;
                const expiringSoon = isExpiringSoon(expiresAt);
                const doNotExtend = row.original.doNotExtend;
                return (
                    <div className="flex items-center gap-2">
                        <div className="text-sm">{formatDateTime(expiresAt)}</div>
                        {expiringSoon && (
                            <Badge variant="destructive" className="text-xs">
                                Expiring Soon
                            </Badge>
                        )}
                        {doNotExtend && (
                            <Badge variant="outline" className="text-xs">
                                No Auto-extend
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            id: "flags",
            header: "Flags",
            cell: ({ row }) => {
                const isRequestToken = row.original.isRequestToken;
                return (
                    <div className="flex gap-1">
                        {isRequestToken && (
                            <Badge variant="secondary" className="text-xs">
                                Request Token
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const session = row.original;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelected(session);
                                    setIsInvalidateModalOpen(true);
                                }}
                                className="text-red-600"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Invalidate Session
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    return (
        <>
            <ResourceSessionsDataTable columns={columns} data={rows} />
            
            <InvalidateSessionDialog
                isOpen={isInvalidateModalOpen}
                onClose={() => {
                    setIsInvalidateModalOpen(false);
                    setSelected(null);
                }}
                onConfirm={() => selected && invalidateSession(selected.sessionId)}
                sessionType="resource"
                sessionInfo={{
                    resourceName: selected?.resourceName,
                }}
                isLoading={isLoading}
            />
        </>
    );
}