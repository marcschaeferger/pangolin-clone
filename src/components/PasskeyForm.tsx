"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserContext } from "@app/hooks/useUserContext";
import { useTranslations } from "next-intl";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { toast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/api";
import { startRegistration } from "@simplewebauthn/browser";
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

type PasskeyFormProps = {
    open: boolean;
    setOpen: (val: boolean) => void;
};

type Passkey = {
    credentialId: string;
    name: string;
    dateCreated: string;
    lastUsed: string;
};

export default function PasskeyForm({ open, setOpen }: PasskeyFormProps) {
    const [loading, setLoading] = useState(false);
    const [passkeys, setPasskeys] = useState<Passkey[]>([]);
    const { user } = useUserContext();
    const t = useTranslations();
    const api = createApiClient(useEnvContext());

    const registerSchema = z.object({
        name: z.string().min(1, { message: t('passkeyNameRequired') })
    });

    const form = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: ""
        }
    });

    useEffect(() => {
        if (open) {
            loadPasskeys();
        }
    }, [open]);

    const loadPasskeys = async () => {
        try {
            const response = await api.get("/auth/passkey/list");
            setPasskeys(response.data.data);
        } catch (error) {
            toast({
                title: "Error",
                description: formatAxiosError(error, t('passkeyLoadError')),
                variant: "destructive"
            });
        }
    };

    const handleRegisterPasskey = async (values: z.infer<typeof registerSchema>) => {
        try {
            setLoading(true);

            // Start registration
            const startRes = await api.post("/auth/passkey/register/start", {
                name: values.name
            });
            const options = startRes.data.data;

            // Create passkey
            const credential = await startRegistration(options);

            // Verify registration
            await api.post("/auth/passkey/register/verify", {
                credential
            });

            toast({
                title: "Success",
                description: t('passkeyRegisterSuccess')
            });

            // Reload passkeys
            await loadPasskeys();
            form.reset();
        } catch (error) {
            toast({
                title: "Error",
                description: formatAxiosError(error, t('passkeyRegisterError')),
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePasskey = async (credentialId: string) => {
        try {
            setLoading(true);
            const encodedCredentialId = encodeURIComponent(credentialId);
            await api.delete(`/auth/passkey/${encodedCredentialId}`);
            
            toast({
                title: "Success",
                description: t('passkeyRemoveSuccess')
            });

            // Reload passkeys
            await loadPasskeys();
        } catch (error) {
            toast({
                title: "Error",
                description: formatAxiosError(error, t('passkeyRemoveError')),
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Credenza open={open} onOpenChange={setOpen}>
            <CredenzaContent>
                <CredenzaHeader>
                    <CredenzaTitle>{t('passkeyManage')}</CredenzaTitle>
                    <CredenzaDescription>
                        {t('passkeyDescription')}
                    </CredenzaDescription>
                </CredenzaHeader>
                <CredenzaBody>
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold">{t('passkeyList')}</h3>
                            {passkeys.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    {t('passkeyNone')}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {passkeys.map((passkey) => (
                                        <div
                                            key={passkey.credentialId}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium">{passkey.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {t('passkeyLastUsed', {
                                                        date: new Date(passkey.lastUsed).toLocaleDateString()
                                                    })}
                                                </p>
                                            </div>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeletePasskey(passkey.credentialId)}
                                                disabled={loading}
                                            >
                                                {t('passkeyRemove')}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold">{t('passkeyRegister')}</h3>
                            <Form {...form}>
                                <form
                                    onSubmit={form.handleSubmit(handleRegisterPasskey)}
                                    className="space-y-4"
                                >
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('passkeyNameLabel')}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder={t('passkeyNamePlaceholder')}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="submit"
                                        loading={loading}
                                        disabled={loading}
                                    >
                                        {t('passkeyRegister')}
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    </div>
                </CredenzaBody>
                <CredenzaFooter>
                    <CredenzaClose asChild>
                        <Button variant="outline">Close</Button>
                    </CredenzaClose>
                </CredenzaFooter>
            </CredenzaContent>
        </Credenza>
    );
} 