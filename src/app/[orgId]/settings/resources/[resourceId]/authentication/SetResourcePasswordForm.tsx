"use client";

import { Button } from "@app/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import { Input } from "@app/components/ui/input";
import { toast } from "@app/hooks/useToast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { formatAxiosError } from "@app/lib/api";
import { AxiosResponse } from "axios";
import { Resource } from "@server/db";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";

const setPasswordFormSchema = z.object({
    password: z.string().min(4).max(100)
});

type SetPasswordFormValues = z.infer<typeof setPasswordFormSchema>;

const defaultValues: Partial<SetPasswordFormValues> = {
    password: ""
};

type SetPasswordFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    resourceId: number;
    onSetPassword?: () => void;
};

export default function SetResourcePasswordForm({
    open,
    setOpen,
    resourceId,
    onSetPassword
}: SetPasswordFormProps) {
    const api = createApiClient(useEnvContext());

    const [loading, setLoading] = useState(false);

    const form = useForm<SetPasswordFormValues>({
        resolver: zodResolver(setPasswordFormSchema),
        defaultValues
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.reset();
    }, [open]);

    async function onSubmit(data: SetPasswordFormValues) {
        setLoading(true);

        api.post<AxiosResponse<Resource>>(`/resource/${resourceId}/password`, {
            password: data.password
        })
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Error setting resource password",
                    description: formatAxiosError(
                        e,
                        "An error occurred while setting the resource password"
                    )
                });
            })
            .then(() => {
                toast({
                    title: "Resource password set",
                    description:
                        "The resource password has been set successfully"
                });

                if (onSetPassword) {
                    onSetPassword();
                }
            })
            .finally(() => setLoading(false));
    }

    return (
        <>
            <Credenza
                open={open}
                onOpenChange={(val) => {
                    setOpen(val);
                    setLoading(false);
                    form.reset();
                }}
            >
                <CredenzaContent>
                    <CredenzaHeader>
                        <CredenzaTitle>Set Password</CredenzaTitle>
                        <CredenzaDescription>
                            Set a password to protect this resource
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                id="set-password-form"
                            >
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    autoComplete="off"
                                                    type="password"
                                                    {...field}
                                                />
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
                            form="set-password-form"
                            loading={loading}
                            disabled={loading}
                        >
                            Enable Password Protection
                        </Button>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>
        </>
    );
}
