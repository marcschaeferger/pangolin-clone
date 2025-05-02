"use client";

import { Button } from "@app/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import { Input } from "@app/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@app/components/ui/select";
import { useToast } from "@app/hooks/useToast";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    InviteUserBody,
    InviteUserResponse,
    ListUsersResponse
} from "@server/routers/user";
import { AxiosResponse } from "axios";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import CopyTextBox from "@app/components/CopyTextBox";
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
import { useOrgContext } from "@app/hooks/useOrgContext";
import { Description } from "@radix-ui/react-toast";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";

type InviteUserFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    string: string;
    title: string;
    dialog: React.ReactNode;
    buttonText: string;
    onConfirm: () => Promise<void>;
};

export default function InviteUserForm({
    open,
    setOpen,
    string,
    title,
    onConfirm,
    buttonText,
    dialog
}: InviteUserFormProps) {
    const [loading, setLoading] = useState(false);

    const api = createApiClient(useEnvContext());

    const formSchema = z.object({
        string: z.string().refine((val) => val === string, {
            message: "Invalid confirmation"
        })
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            string: ""
        }
    });

    function reset() {
        form.reset();
        setLoading(false);
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        await onConfirm();
        reset();
    }

    return (
        <>
            <Credenza
                open={open}
                onOpenChange={(val) => {
                    setOpen(val);
                    reset();
                }}
            >
                <CredenzaContent>
                    <CredenzaHeader>
                        <CredenzaTitle>{title}</CredenzaTitle>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <div className="mb-4 break-all overflow-hidden">{dialog}</div>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                id="confirm-delete-form"
                            >
                                <FormField
                                    control={form.control}
                                    name="string"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </CredenzaBody>
                    <CredenzaFooter>
                        <CredenzaClose asChild>
                            <Button variant="outline">Close</Button>
                        </CredenzaClose>
                        <Button
                            type="submit"
                            form="confirm-delete-form"
                            loading={loading}
                            disabled={loading}
                        >
                            {buttonText}
                        </Button>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>
        </>
    );
}
