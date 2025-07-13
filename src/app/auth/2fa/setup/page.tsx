"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { AxiosResponse } from "axios";
import {
    RequestTotpSecretResponse,
    VerifyTotpResponse
} from "@server/routers/auth";
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
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { toast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/api";
import CopyTextBox from "@app/components/CopyTextBox";
import { QRCodeCanvas } from "qrcode.react";
import { useTranslations } from "next-intl";

export default function Setup2FAPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams?.get("redirect");
    const email = searchParams?.get("email");
    
    const [step, setStep] = useState(1);
    const [secretKey, setSecretKey] = useState("");
    const [secretUri, setSecretUri] = useState("");
    const [loading, setLoading] = useState(false);
    const [backupCodes, setBackupCodes] = useState<string[]>([]);

    const api = createApiClient(useEnvContext());
    const t = useTranslations();

    // Redirect to login if no email is provided
    useEffect(() => {
        if (!email) {
            router.push('/auth/login');
        }
    }, [email, router]);

    const enableSchema = z.object({
        password: z.string().min(1, { message: t('passwordRequired') })
    });

    const confirmSchema = z.object({
        code: z.string().length(6, { message: t('pincodeInvalid') })
    });

    const enableForm = useForm<z.infer<typeof enableSchema>>({
        resolver: zodResolver(enableSchema),
        defaultValues: {
            password: ""
        }
    });

    const confirmForm = useForm<z.infer<typeof confirmSchema>>({
        resolver: zodResolver(confirmSchema),
        defaultValues: {
            code: ""
        }
    });

    const request2fa = async (values: z.infer<typeof enableSchema>) => {
        if (!email) return;
        
        setLoading(true);

        const res = await api
            .post<AxiosResponse<RequestTotpSecretResponse>>(
                `/auth/2fa/setup`,
                {
                    email: email,
                    password: values.password
                }
            )
            .catch((e) => {
                toast({
                    title: t('otpErrorEnable'),
                    description: formatAxiosError(
                        e,
                        t('otpErrorEnableDescription')
                    ),
                    variant: "destructive"
                });
            });

        if (res && res.data.data.secret) {
            setSecretKey(res.data.data.secret);
            setSecretUri(res.data.data.uri);
            setStep(2);
        }

        setLoading(false);
    };

    const confirm2fa = async (values: z.infer<typeof confirmSchema>) => {
        if (!email) return;
        
        setLoading(true);

        const { password } = enableForm.getValues();

        const res = await api
            .post<AxiosResponse<VerifyTotpResponse>>(`/auth/2fa/complete-setup`, {
                email: email,
                password: password,
                code: values.code
            })
            .catch((e) => {
                toast({
                    title: t('otpErrorEnable'),
                    description: formatAxiosError(
                        e,
                        t('otpErrorEnableDescription')
                    ),
                    variant: "destructive"
                });
            });

        if (res && res.data.data.valid) {
            setBackupCodes(res.data.data.backupCodes || []);
            setStep(3);
        }

        setLoading(false);
    };

    const handleComplete = () => {
        if (redirect) {
            router.push(redirect);
        } else {
            router.push("/");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{t('otpSetup')}</CardTitle>
                    <CardDescription>
                        Your administrator has enabled two-factor authentication for <strong>{email}</strong>. 
                        Please complete the setup process to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 1 && (
                        <Form {...enableForm}>
                            <form
                                onSubmit={enableForm.handleSubmit(request2fa)}
                                className="space-y-4"
                            >
                                <div className="space-y-4">
                                    <FormField
                                        control={enableForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('password')}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="password"
                                                        placeholder="Enter your current password"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    loading={loading}
                                    disabled={loading}
                                >
                                    Continue
                                </Button>
                            </form>
                        </Form>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                {t('otpSetupScanQr')}
                            </p>
                            <div className="flex justify-center">
                                <QRCodeCanvas value={secretUri} size={200} />
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground">Manual entry key:</Label>
                                <CopyTextBox
                                    text={secretKey}
                                    wrapText={false}
                                />
                            </div>

                            <Form {...confirmForm}>
                                <form
                                    onSubmit={confirmForm.handleSubmit(confirm2fa)}
                                    className="space-y-4"
                                >
                                    <FormField
                                        control={confirmForm.control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>
                                                    {t('otpSetupSecretCode')}
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter 6-digit code"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        loading={loading}
                                        disabled={loading}
                                    >
                                        Verify and Complete Setup
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 text-center">
                            <CheckCircle2
                                className="mx-auto text-green-500"
                                size={48}
                            />
                            <p className="font-semibold text-lg">
                                {t('otpSetupSuccess')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {t('otpSetupSuccessStoreBackupCodes')}
                            </p>

                            {backupCodes.length > 0 && (
                                <div>
                                    <Label className="text-xs text-muted-foreground">Backup codes:</Label>
                                    <CopyTextBox text={backupCodes.join("\n")} />
                                </div>
                            )}

                            <Button
                                onClick={handleComplete}
                                className="w-full"
                            >
                                Continue to Application
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}