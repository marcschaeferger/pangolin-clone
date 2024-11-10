"use client";

import api from "@app/api";
import { Button } from "@app/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@app/components/ui/form";
import { Input } from "@app/components/ui/input";
import { useToast } from "@app/hooks/useToast";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosResponse } from "axios";
import { useState } from "react";
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
    CredenzaTitle,
} from "@app/components/Credenza";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { CreateRoleBody, CreateRoleResponse } from "@server/routers/role";

type CreateRoleFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    afterCreate?: (res: CreateRoleResponse) => Promise<void>;
};

const formSchema = z.object({
    name: z.string({ message: "Name is required" }).max(32),
    description: z.string().max(255).optional(),
});

export default function CreateRoleForm({
    open,
    setOpen,
    afterCreate,
}: CreateRoleFormProps) {
    const { toast } = useToast();
    const { org } = useOrgContext();

    const [loading, setLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);

        const res = await api
            .put<AxiosResponse<CreateRoleResponse>>(
                `/org/${org?.org.orgId}/role`,
                {
                    name: values.name,
                    description: values.description,
                } as CreateRoleBody
            )
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to create role",
                    description:
                        e.response?.data?.message ||
                        "An error occurred while creating the role.",
                });
            });

        if (res && res.status === 201) {
            toast({
                variant: "default",
                title: "Role created",
                description: "The role has been successfully created.",
            });

            if (open) {
                setOpen(false);
            }

            if (afterCreate) {
                afterCreate(res.data.data);
            }
        }

        setLoading(false);
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
                        <CredenzaTitle>Create Role</CredenzaTitle>
                        <CredenzaDescription>
                            Create a new role to group users and manage their
                            permissions.
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                id="create-role-form"
                            >
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter name for the role"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Describe the role"
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
                        <Button
                            type="submit"
                            form="create-role-form"
                            loading={loading}
                            disabled={loading}
                        >
                            Create Role
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
