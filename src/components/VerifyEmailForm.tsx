"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import api from "@app/api";
import { AxiosResponse } from "axios";
import { VerifyEmailResponse } from "@server/routers/auth";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { useToast } from "@app/hooks/use-toast";
import { useRouter } from "next/navigation";

const FormSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    pin: z.string().min(8, {
        message: "Your verification code must be 8 characters.",
    }),
});

export type VerifyEmailFormProps = {
    email: string;
};

export default function VerifyEmailForm({ email }: VerifyEmailFormProps) {
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isResending, setIsResending] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { toast } = useToast();

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            email: email,
            pin: "",
        },
    });

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        setIsSubmitting(true);

        const res = await api
            .post<AxiosResponse<VerifyEmailResponse>>("/auth/verify-email", {
                code: data.pin,
            })
            .catch((e) => {
                setError(e.response?.data?.message || "An error occurred");
                console.error("Failed to verify email:", e);
            });

        if (res && res.data?.data?.valid) {
            setError(null);
            setSuccessMessage(
                "Email successfully verified! Redirecting you...",
            );
            setTimeout(() => {
                router.push("/");
                setIsSubmitting(false);
            }, 3000);
        }
    }

    async function handleResendCode() {
        setIsResending(true);

        const res = await api.post("/auth/verify-email/request").catch((e) => {
            setError(e.response?.data?.message || "An error occurred");
            console.error("Failed to resend verification code:", e);
        });

        if (res) {
            setError(null);
            toast({
                variant: "default",
                title: "Verification code resent",
                description:
                    "We've resent a verification code to your email address. Please check your inbox.",
            });
        }

        setIsResending(false);
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Verify Your Email</CardTitle>
                <CardDescription>
                    Enter the verification code sent to your email address.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Email"
                                            {...field}
                                            disabled
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="pin"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Verification Code</FormLabel>
                                    <FormControl>
                                        <div className="flex justify-center">
                                            <InputOTP maxLength={8} {...field}>
                                                <InputOTPGroup className="flex">
                                                    <InputOTPSlot index={0} />
                                                    <InputOTPSlot index={1} />
                                                    <InputOTPSlot index={2} />
                                                    <InputOTPSlot index={3} />
                                                    <InputOTPSlot index={4} />
                                                    <InputOTPSlot index={5} />
                                                    <InputOTPSlot index={6} />
                                                    <InputOTPSlot index={7} />
                                                </InputOTPGroup>
                                            </InputOTP>
                                        </div>
                                    </FormControl>
                                    <FormDescription>
                                        We sent a verification code to your
                                        email address. Please enter the code to
                                        verify your email address.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {error && (
                            <Alert>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {successMessage && (
                            <Alert>
                                <AlertDescription>
                                    {successMessage}
                                </AlertDescription>
                            </Alert>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Submit
                        </Button>

                        <div className="flex justify-center">
                            <Button
                                type="button"
                                variant="link"
                                onClick={handleResendCode}
                                disabled={isResending}
                            >
                                {isResending
                                    ? "Resending..."
                                    : "Didn't receive a code? Click here to resend"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
