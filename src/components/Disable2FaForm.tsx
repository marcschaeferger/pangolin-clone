"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { AxiosResponse } from "axios";
import { Disable2faBody, Disable2faResponse } from "@server/routers/auth";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
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
import { toast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/api";;
import { useUserContext } from "@app/hooks/useUserContext";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { CheckCircle2 } from "lucide-react";

const disableSchema = z.object({
    password: z.string().min(1, { message: "Password is required" }),
    code: z.string().min(1, { message: "Code is required" })
});

type Disable2FaProps = {
    open: boolean;
    setOpen: (val: boolean) => void;
};

export default function Disable2FaForm({ open, setOpen }: Disable2FaProps) {
    const [loading, setLoading] = useState(false);

    const [step, setStep] = useState<"password" | "success">("password");

    const { user, updateUser } = useUserContext();

    const api = createApiClient(useEnvContext());

    const disableForm = useForm<z.infer<typeof disableSchema>>({
        resolver: zodResolver(disableSchema),
        defaultValues: {
            password: "",
            code: ""
        }
    });

    const request2fa = async (values: z.infer<typeof disableSchema>) => {
        setLoading(true);

        const res = await api
            .post<AxiosResponse<Disable2faResponse>>(`/auth/2fa/disable`, {
                password: values.password,
                code: values.code
            } as Disable2faBody)
            .catch((e) => {
                toast({
                    title: "Unable to disable 2FA",
                    description: formatAxiosError(
                        e,
                        "An error occurred while disabling 2FA"
                    ),
                    variant: "destructive"
                });
            });

        if (res) {
            // toast({
            //     title: "Two-factor disabled",
            //     description:
            //         "Two-factor authentication has been disabled for your account"
            // });
            updateUser({ twoFactorEnabled: false });
            setStep("success");
        }

        setLoading(false);
    };

    function reset() {
        disableForm.reset();
        setStep("password");
        setLoading(false);
    }

    return (
        <Credenza
            open={open}
            onOpenChange={(val) => {
                setOpen(val);
                reset();
            }}
        >
            <CredenzaContent>
                <CredenzaHeader>
                    <CredenzaTitle>
                        Disable Two-factor Authentication
                    </CredenzaTitle>
                    <CredenzaDescription>
                        Disable two-factor authentication for your account
                    </CredenzaDescription>
                </CredenzaHeader>
                <CredenzaBody>
                    {step === "password" && (
                        <Form {...disableForm}>
                            <form
                                onSubmit={disableForm.handleSubmit(request2fa)}
                                className="space-y-4"
                                id="form"
                            >
                                <div className="space-y-4">
                                    <FormField
                                        control={disableForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={disableForm.control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    Authenticator Code
                                                </FormLabel>
                                                <FormControl>
                                                    <InputOTP
                                                        maxLength={6}
                                                        {...field}
                                                        pattern={
                                                            REGEXP_ONLY_DIGITS_AND_CHARS
                                                        }
                                                    >
                                                        <InputOTPGroup>
                                                            <InputOTPSlot
                                                                index={0}
                                                            />
                                                            <InputOTPSlot
                                                                index={1}
                                                            />
                                                            <InputOTPSlot
                                                                index={2}
                                                            />
                                                        </InputOTPGroup>
                                                        <InputOTPGroup>
                                                            <InputOTPSlot
                                                                index={3}
                                                            />
                                                            <InputOTPSlot
                                                                index={4}
                                                            />
                                                            <InputOTPSlot
                                                                index={5}
                                                            />
                                                        </InputOTPGroup>
                                                    </InputOTP>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </form>
                        </Form>
                    )}

                    {step === "success" && (
                        <div className="space-y-4 text-center">
                            <CheckCircle2
                                className="mx-auto text-green-500"
                                size={48}
                            />
                            <p className="font-semibold text-lg">
                                Two-Factor Authentication Disabled
                            </p>
                            <p>
                                Two-factor authentication has been disabled for
                                your account. You can enable it again at any
                                time.
                            </p>
                        </div>
                    )}
                </CredenzaBody>
                <CredenzaFooter>
                    {step === "password" && (
                        <Button
                            type="submit"
                            form="form"
                            loading={loading}
                            disabled={loading}
                        >
                            Disable 2FA
                        </Button>
                    )}
                    <CredenzaClose asChild>
                        <Button variant="outline">Close</Button>
                    </CredenzaClose>
                </CredenzaFooter>
            </CredenzaContent>
        </Credenza>
    );
}
