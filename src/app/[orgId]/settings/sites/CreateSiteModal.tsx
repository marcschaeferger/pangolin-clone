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
import { SiteRow } from "./SitesTable";
import CreateSiteForm from "./CreateSiteForm";

type CreateSiteFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    onCreate?: (site: SiteRow) => void;
    orgId: string;
};

export default function CreateSiteFormModal({
    open,
    setOpen,
    onCreate,
    orgId
}: CreateSiteFormProps) {
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
                        <CredenzaTitle>Create Site</CredenzaTitle>
                        <CredenzaDescription>
                            Create a new site to start connecting your resources
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <div className="max-w-md">
                            <CreateSiteForm
                                setLoading={(val) => setLoading(val)}
                                setChecked={(val) => setIsChecked(val)}
                                onCreate={onCreate}
                                orgId={orgId}
                            />
                        </div>
                    </CredenzaBody>
                    <CredenzaFooter>
                        <CredenzaClose asChild>
                            <Button variant="outline">Close</Button>
                        </CredenzaClose>
                        <Button
                            type="submit"
                            form="create-site-form"
                            loading={loading}
                            disabled={loading || !isChecked}
                            onClick={() => {
                                setOpen(false);
                            }}
                        >
                            Create Site
                        </Button>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>
        </>
    );
}
