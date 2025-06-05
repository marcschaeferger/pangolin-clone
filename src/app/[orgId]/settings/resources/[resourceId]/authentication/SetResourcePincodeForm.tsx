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
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot
} from "@app/components/ui/input-otp";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";

const setPincodeFormSchema = z.object({
    pincode: z.string().length(6)
});

type SetPincodeFormValues = z.infer<typeof setPincodeFormSchema>;

const defaultValues: Partial<SetPincodeFormValues> = {
    pincode: ""
};

type SetPincodeFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    resourceId: number;
    onSetPincode?: () => void;
};

export default function SetResourcePincodeForm({
    open,
    setOpen,
    resourceId,
    onSetPincode
}: SetPincodeFormProps) {
    const [loading, setLoading] = useState(false);

    const api = createApiClient(useEnvContext());

    const form = useForm<SetPincodeFormValues>({
        resolver: zodResolver(setPincodeFormSchema),
        defaultValues
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.reset();
    }, [open]);

    async function onSubmit(data: SetPincodeFormValues) {
        setLoading(true);

        api.post<AxiosResponse<Resource>>(`/resource/${resourceId}/pincode`, {
            pincode: data.pincode
        })
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Error setting resource PIN code",
                    description: formatAxiosError(
                        e,
                        "An error occurred while setting the resource PIN code"
                    )
                });
            })
            .then(() => {
                toast({
                    title: "Resource PIN code set",
                    description:
                        "The resource pincode has been set successfully"
                });

                if (onSetPincode) {
                    onSetPincode();
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
                        <CredenzaTitle>Set Pincode</CredenzaTitle>
                        <CredenzaDescription>
                            Set a pincode to protect this resource
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                id="set-pincode-form"
                            >
                                <FormField
                                    control={form.control}
                                    name="pincode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>PIN Code</FormLabel>
                                            <FormControl>
                                                <div className="flex justify-center">
                                                    <InputOTP
                                                        autoComplete="false"
                                                        maxLength={6}
                                                        {...field}
                                                    >
                                                        <InputOTPGroup className="flex">
                                                            <InputOTPSlot
                                                                index={0}
                                                                obscured
                                                            />
                                                            <InputOTPSlot
                                                                index={1}
                                                                obscured
                                                            />
                                                            <InputOTPSlot
                                                                index={2}
                                                                obscured
                                                            />
                                                            <InputOTPSlot
                                                                index={3}
                                                                obscured
                                                            />
                                                            <InputOTPSlot
                                                                index={4}
                                                                obscured
                                                            />
                                                            <InputOTPSlot
                                                                index={5}
                                                                obscured
                                                            />
                                                        </InputOTPGroup>
                                                    </InputOTP>
                                                </div>
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
                            form="set-pincode-form"
                            loading={loading}
                            disabled={loading}
                        >
                            Enable PIN Code Protection
                        </Button>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>
        </>
    );
}
