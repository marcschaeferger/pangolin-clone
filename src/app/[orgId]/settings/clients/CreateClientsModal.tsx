"use client";

import { Button } from "@app/components/ui/button";
import { useState } from "react";
import {
    Credenza,
    CredenzaBody,
    CredenzaClose,
    CredenzaContent,
    CredenzaDescription,
    CredenzaFooter,
    CredenzaHeader,
    CredenzaTitle
} from "@app/components/Credenza";
import CreateClientForm from "./CreateClientsForm";
import { ClientRow } from "./ClientsTable";

type CreateClientFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    onCreate?: (client: ClientRow) => void;
    orgId: string;
};

export default function CreateClientFormModal({
    open,
    setOpen,
    onCreate,
    orgId
}: CreateClientFormProps) {
    const [loading, setLoading] = useState(false);
    const [isChecked, setIsChecked] = useState(false);

    return (
        <>
            <Credenza
                open={open}
                onOpenChange={(val) => {
                    setOpen(val);
                    setLoading(false);
                }}
            >
                <CredenzaContent>
                    <CredenzaHeader>
                        <CredenzaTitle>Create Client</CredenzaTitle>
                        <CredenzaDescription>
                            Create a new client to connect to your sites
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <div className="max-w-md">
                            <CreateClientForm
                                setLoading={(val) => setLoading(val)}
                                setChecked={(val) => setIsChecked(val)}
                                onCreate={onCreate}
                                orgId={orgId}
                            />
                        </div>
                    </CredenzaBody>
                    <CredenzaFooter>
                        <Button
                            type="submit"
                            form="create-client-form"
                            loading={loading}
                            disabled={loading || !isChecked}
                            onClick={() => {
                                setOpen(false);
                            }}
                        >
                            Create Client
                        </Button>
                        <CredenzaClose asChild>
                            <Button variant="outline">Close</Button>
                        </CredenzaClose>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>
        </>
    );
}
