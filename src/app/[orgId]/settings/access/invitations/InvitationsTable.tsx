"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@app/components/ui/dropdown-menu";
import { Button } from "@app/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { InvitationsDataTable } from "./InvitationsDataTable";
import { useState } from "react";
import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import RegenerateInvitationForm from "./RegenerateInvitationForm";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { toast } from "@app/hooks/useToast";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";

export type InvitationRow = {
    id: string;
    email: string;
    expiresAt: string;
    role: string;
    roleId: number;
};

type InvitationsTableProps = {
    invitations: InvitationRow[];
};

export default function InvitationsTable({
    invitations: i
}: InvitationsTableProps) {
    const [invitations, setInvitations] = useState<InvitationRow[]>(i);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
    const [selectedInvitation, setSelectedInvitation] =
        useState<InvitationRow | null>(null);

    const api = createApiClient(useEnvContext());
    const { org } = useOrgContext();

    const columns: ColumnDef<InvitationRow>[] = [
        {
            id: "dots",
            cell: ({ row }) => {
                const invitation = row.original;
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
                                    setIsRegenerateModalOpen(true);
                                    setSelectedInvitation(invitation);
                                }}
                            >
                                <span>Regenerate Invitation</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    setIsDeleteModalOpen(true);
                                    setSelectedInvitation(invitation);
                                }}
                            >
                                <span className="text-red-500">
                                    Remove Invitation
                                </span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            }
        },
        {
            accessorKey: "email",
            header: "Email"
        },
        {
            accessorKey: "expiresAt",
            header: "Expires At",
            cell: ({ row }) => {
                const expiresAt = new Date(row.original.expiresAt);
                const isExpired = expiresAt < new Date();

                return (
                    <span className={isExpired ? "text-red-500" : ""}>
                        {expiresAt.toLocaleString()}
                    </span>
                );
            }
        },
        {
            accessorKey: "role",
            header: "Role"
        }
    ];

    async function removeInvitation() {
        if (selectedInvitation) {
            const res = await api
                .delete(
                    `/org/${org?.org.orgId}/invitations/${selectedInvitation.id}`
                )
                .catch((e) => {
                    toast({
                        variant: "destructive",
                        title: "Failed to remove invitation",
                        description:
                            "An error occurred while removing the invitation."
                    });
                });

            if (res && res.status === 200) {
                toast({
                    variant: "default",
                    title: "Invitation removed",
                    description: `The invitation for ${selectedInvitation.email} has been removed.`
                });

                setInvitations((prev) =>
                    prev.filter(
                        (invitation) => invitation.id !== selectedInvitation.id
                    )
                );
            }
        }
        setIsDeleteModalOpen(false);
    }

    return (
        <>
            <ConfirmDeleteDialog
                open={isDeleteModalOpen}
                setOpen={(val) => {
                    setIsDeleteModalOpen(val);
                    setSelectedInvitation(null);
                }}
                dialog={
                    <div className="space-y-4">
                        <p>
                            Are you sure you want to remove the invitation for{" "}
                            <b>{selectedInvitation?.email}</b>?
                        </p>
                        <p>
                            Once removed, this invitation will no longer be
                            valid. You can always re-invite the user later.
                        </p>
                        <p>
                            To confirm, please type the email address of the
                            invitation below.
                        </p>
                    </div>
                }
                buttonText="Confirm Remove Invitation"
                onConfirm={removeInvitation}
                string={selectedInvitation?.email ?? ""}
                title="Remove Invitation"
            />
            <RegenerateInvitationForm
                open={isRegenerateModalOpen}
                setOpen={setIsRegenerateModalOpen}
                invitation={selectedInvitation}
                onRegenerate={(updatedInvitation) => {
                    setInvitations((prev) =>
                        prev.map((inv) =>
                            inv.id === updatedInvitation.id
                                ? updatedInvitation
                                : inv
                        )
                    );
                }}
            />

            <InvitationsDataTable columns={columns} data={invitations} />
        </>
    );
}
