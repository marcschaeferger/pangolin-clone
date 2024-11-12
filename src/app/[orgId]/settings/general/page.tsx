"use client";

import ConfirmDeleteDialog from "@app/components/ConfirmDeleteDialog";
import { Button } from "@app/components/ui/button";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { userOrgUserContext } from "@app/hooks/useOrgUserContext";
import { useState } from "react";

export default function GeneralPage() {
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const { orgUser } = userOrgUserContext();
    const { org } = useOrgContext();

    async function deleteOrg() {
        console.log("not implemented");
    }

    return (
        <>
            <ConfirmDeleteDialog
                open={isDeleteModalOpen}
                setOpen={(val) => {
                    setIsDeleteModalOpen(val);
                }}
                dialog={
                    <div>
                        <p className="mb-2">
                            Are you sure you want to delete the organization{" "}
                            <b>{org?.org.name}?</b>
                        </p>

                        <p className="mb-2">
                            This action is irreversible and will delete all
                            associated data.
                        </p>

                        <p>
                            To confirm, type the name of the organization below.
                        </p>
                    </div>
                }
                buttonText="Confirm delete organization"
                onConfirm={deleteOrg}
                string={org?.org.name || ""}
                title="Delete organization"
            />

            {orgUser.isOwner ? (
                <Button onClick={() => setIsDeleteModalOpen(true)}>
                    Delete Organization
                </Button>
            ) : (
                <p>Nothing to see here</p>
            )}
        </>
    );
}
