"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UserSessionsDataTable } from "./UserSessionsDataTable";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, LogOut, Users } from "lucide-react";
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
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type UserSessionRow = {
    sessionId: string;
    userId: string;
    username: string;
    email: string | null;
    expiresAt: number;
    createdAt: number;
};

type Props = {
    sessions: UserSessionRow[];
};

export default function UserSessionsTable({ sessions }: Props) {
    const t = useTranslations();

    const [isInvalidateModalOpen, setIsInvalidateModalOpen] = useState(false);
    const [isInvalidateAllModalOpen, setIsInvalidateAllModalOpen] = useState(false);
    const [selected, setSelected] = useState<UserSessionRow | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [rows, setRows] = useState<UserSessionRow[]>(sessions);
    const [isLoading, setIsLoading] = useState(false);

    const api = createApiClient(useEnvContext());

    const invalidateSession = async (sessionId: string) => {
        setIsLoading(true);
        try {
            await api.delete(`/session/user/${sessionId}`);
            setRows(prevRows => prevRows.filter(row => row.sessionId !== sessionId));
            toast({
                title: "Session invalidated",
                description: "The user session has been successfully invalidated.",
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

    const invalidateAllUserSessions = async (userId: string) => {
        setIsLoading(true);
        try {
            await api.delete(`/sessions/user/${userId}`);
            setRows(prevRows => prevRows.filter(row => row.userId !== userId));
            toast({
                title: "All user sessions invalidated",
                description: "All sessions for this user have been successfully invalidated.",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: formatAxiosError(error),
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
            setIsInvalidateAllModalOpen(false);
            setSelectedUserId(null);
        }
    };

    const formatDateTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const isExpiringSoon = (expiresAt: number) => {
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        return expiresAt - Date.now() < oneHour;
    };

    const columns: ColumnDef<UserSessionRow>[] = [
        {
            accessorKey: "username",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Username
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="font-medium">{row.getValue("username")}</div>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {row.getValue("email") || "No email"}
                </div>
            ),
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Created
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => (
                <div className="text-sm">{formatDateTime(row.getValue("createdAt"))}</div>
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
                return (
                    <div className="flex items-center gap-2">
                        <div className="text-sm">{formatDateTime(expiresAt)}</div>
                        {expiringSoon && (
                            <Badge variant="destructive" className="text-xs">
                                Expiring Soon
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelectedUserId(session.userId);
                                    setIsInvalidateAllModalOpen(true);
                                }}
                                className="text-red-600"
                            >
                                <Users className="mr-2 h-4 w-4" />
                                Invalidate All User Sessions
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    return (
        <>
            <UserSessionsDataTable columns={columns} data={rows} />
            
            <InvalidateSessionDialog
                isOpen={isInvalidateModalOpen}
                onClose={() => {
                    setIsInvalidateModalOpen(false);
                    setSelected(null);
                }}
                onConfirm={() => selected && invalidateSession(selected.sessionId)}
                sessionType="user"
                sessionInfo={{
                    username: selected?.username,
                    email: selected?.email,
                }}
                isLoading={isLoading}
            />

            <InvalidateSessionDialog
                isOpen={isInvalidateAllModalOpen}
                onClose={() => {
                    setIsInvalidateAllModalOpen(false);
                    setSelectedUserId(null);
                }}
                onConfirm={() => selectedUserId && invalidateAllUserSessions(selectedUserId)}
                sessionType="user"
                sessionInfo={{
                    username: rows.find(r => r.userId === selectedUserId)?.username,
                    email: rows.find(r => r.userId === selectedUserId)?.email,
                }}
                isLoading={isLoading}
            />
        </>
    );
}