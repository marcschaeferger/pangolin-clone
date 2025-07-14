"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createApiClient } from "@app/lib/api";
import { formatAxiosError } from "@app/lib/api";
import { toast } from "@app/hooks/useToast";
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
import { Alert, AlertDescription } from "@app/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@app/components/ui/dialog";
import { startRegistration } from "@simplewebauthn/browser";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { Card, CardContent } from "@app/components/ui/card";
import { Badge } from "@app/components/ui/badge";
import { Loader2, KeyRound, Trash2, Plus, Shield } from "lucide-react";
import { cn } from "@app/lib/cn";

type SecurityKeyFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
};

type SecurityKey = {
    credentialId: string;
    name: string;
    lastUsed: string;
};

type DeleteSecurityKeyData = {
    credentialId: string;
    name: string;
};

type RegisterFormValues = {
    name: string;
    password: string;
};

type DeleteFormValues = {
    password: string;
    code?: string;
};

type FieldProps = {
    field: {
        value: string;
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
        onBlur: () => void;
        name: string;
        ref: React.Ref<HTMLInputElement>;
    };
};

export default function SecurityKeyForm({ open, setOpen }: SecurityKeyFormProps) {
    const t = useTranslations();
    const { env } = useEnvContext();
    const api = createApiClient({ env });
    const [securityKeys, setSecurityKeys] = useState<SecurityKey[]>([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [showRegisterDialog, setShowRegisterDialog] = useState(false);
    const [selectedSecurityKey, setSelectedSecurityKey] = useState<DeleteSecurityKeyData | null>(null);
    const [show2FADialog, setShow2FADialog] = useState(false);
    const [deleteInProgress, setDeleteInProgress] = useState(false);
    const [pendingDeleteCredentialId, setPendingDeleteCredentialId] = useState<string | null>(null);
    const [pendingDeletePassword, setPendingDeletePassword] = useState<string | null>(null);

    useEffect(() => {
        loadSecurityKeys();
    }, []);

    const registerSchema = z.object({
        name: z.string().min(1, { message: t('securityKeyNameRequired') }),
        password: z.string().min(1, { message: t('passwordRequired') }),
    });

    const deleteSchema = z.object({
        password: z.string().min(1, { message: t('passwordRequired') }),
        code: z.string().optional()
    });

    const registerForm = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: "",
            password: "",
        },
    });

    const deleteForm = useForm<DeleteFormValues>({
        resolver: zodResolver(deleteSchema),
        defaultValues: {
            password: "",
            code: ""
        },
    });

    const loadSecurityKeys = async () => {
        try {
            const response = await api.get("/auth/security-key/list");
            setSecurityKeys(response.data.data);
        } catch (error) {
            toast({
                variant: "destructive",
                description: formatAxiosError(error, t('securityKeyLoadError')),
            });
        }
    };

    const handleRegisterSecurityKey = async (values: RegisterFormValues) => {
        try {
            // Check browser compatibility first
            if (!window.PublicKeyCredential) {
                toast({
                    variant: "destructive",
                    description: t('securityKeyBrowserNotSupported', {
                        defaultValue: "Your browser doesn't support security keys. Please use a modern browser like Chrome, Firefox, or Safari."
                    })
                });
                return;
            }

            setIsRegistering(true);
            const startRes = await api.post("/auth/security-key/register/start", {
                name: values.name,
                password: values.password,
            });

            if (startRes.status === 202) {
                toast({
                    variant: "destructive",
                    description: t('twoFactorRequired', {
                        defaultValue: "Two-factor authentication is required to register a security key."
                    })
                });
                return;
            }

            const options = startRes.data.data;
            
            try {
                const credential = await startRegistration(options);

                await api.post("/auth/security-key/register/verify", {
                    credential,
                });

                toast({
                    description: t('securityKeyRegisterSuccess', {
                        defaultValue: "Security key registered successfully"
                    })
                });

                registerForm.reset();
                setShowRegisterDialog(false);
                await loadSecurityKeys();
            } catch (error: any) {
                if (error.name === 'NotAllowedError') {
                    if (error.message.includes('denied permission')) {
                        toast({
                            variant: "destructive",
                            description: t('securityKeyPermissionDenied', {
                                defaultValue: "Please allow access to your security key to continue registration."
                            })
                        });
                    } else {
                        toast({
                            variant: "destructive",
                            description: t('securityKeyRemovedTooQuickly', {
                                defaultValue: "Please keep your security key connected until the registration process completes."
                            })
                        });
                    }
                } else if (error.name === 'NotSupportedError') {
                    toast({
                        variant: "destructive",
                        description: t('securityKeyNotSupported', {
                            defaultValue: "Your security key may not be compatible. Please try a different security key."
                        })
                    });
                } else {
                    toast({
                        variant: "destructive",
                        description: t('securityKeyUnknownError', {
                            defaultValue: "There was a problem registering your security key. Please try again."
                        })
                    });
                }
                throw error; // Re-throw to be caught by outer catch
            }
        } catch (error) {
            console.error('Security key registration error:', error);
            toast({
                variant: "destructive",
                description: formatAxiosError(error, t('securityKeyRegisterError', {
                    defaultValue: "Failed to register security key"
                }))
            });
        } finally {
            setIsRegistering(false);
        }
    };

    const handleDeleteSecurityKey = async (values: DeleteFormValues) => {
        if (!selectedSecurityKey) return;

        try {
            setDeleteInProgress(true);
            const encodedCredentialId = encodeURIComponent(selectedSecurityKey.credentialId);
            const response = await api.delete(`/auth/security-key/${encodedCredentialId}`, {
                data: {
                    password: values.password,
                    code: values.code
                }
            });

            // If 2FA is required
            if (response.status === 202 && response.data.data.codeRequested) {
                setPendingDeleteCredentialId(encodedCredentialId);
                setPendingDeletePassword(values.password);
                setShow2FADialog(true);
                return;
            }

            toast({
                description: t('securityKeyRemoveSuccess')
            });

            deleteForm.reset();
            setSelectedSecurityKey(null);
            await loadSecurityKeys();
        } catch (error) {
            toast({
                variant: "destructive",
                description: formatAxiosError(error, t('securityKeyRemoveError')),
            });
        } finally {
            setDeleteInProgress(false);
        }
    };

    const handle2FASubmit = async (values: DeleteFormValues) => {
        if (!pendingDeleteCredentialId || !pendingDeletePassword) return;

        try {
            setDeleteInProgress(true);
            await api.delete(`/auth/security-key/${pendingDeleteCredentialId}`, {
                data: {
                    password: pendingDeletePassword,
                    code: values.code
                }
            });

            toast({
                description: t('securityKeyRemoveSuccess')
            });

            deleteForm.reset();
            setSelectedSecurityKey(null);
            setShow2FADialog(false);
            setPendingDeleteCredentialId(null);
            setPendingDeletePassword(null);
            await loadSecurityKeys();
        } catch (error) {
            toast({
                variant: "destructive",
                description: formatAxiosError(error, t('securityKeyRemoveError')),
            });
        } finally {
            setDeleteInProgress(false);
        }
    };

    const onOpenChange = (open: boolean) => {
        if (open) {
            loadSecurityKeys();
        } else {
            registerForm.reset();
            deleteForm.reset();
            setSelectedSecurityKey(null);
            setShowRegisterDialog(false);
        }
        setOpen(open);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            {t('securityKeyManage')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('securityKeyDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-muted-foreground">{t('securityKeyList')}</h3>
                            <Button
                                className="h-8 w-8 p-0"
                                onClick={() => setShowRegisterDialog(true)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {securityKeys.length > 0 ? (
                            <div className="space-y-2">
                                {securityKeys.map((securityKey) => (
                                    <Card key={securityKey.credentialId}>
                                        <CardContent className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                                                    <KeyRound className="h-4 w-4 text-secondary-foreground" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{securityKey.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('securityKeyLastUsed', {
                                                            date: new Date(securityKey.lastUsed).toLocaleDateString()
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                className="h-8 w-8 p-0 text-white hover:text-white/80"
                                                onClick={() => setSelectedSecurityKey({
                                                    credentialId: securityKey.credentialId,
                                                    name: securityKey.name
                                                })}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Shield className="mb-2 h-12 w-12 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">No security keys registered</p>
                                <p className="text-xs text-muted-foreground">Add a security key to enhance your account security</p>
                            </div>
                        )}

                        {securityKeys.length === 1 && (
                            <Alert variant="default">
                                <AlertDescription>{t('securityKeyRecommendation')}</AlertDescription>
                            </Alert>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Register New Security Key</DialogTitle>
                        <DialogDescription>
                            Connect your security key and enter a name to identify it
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...registerForm}>
                        <form onSubmit={registerForm.handleSubmit(handleRegisterSecurityKey)} className="space-y-4">
                            <FormField
                                control={registerForm.control}
                                name="name"
                                render={({ field }: FieldProps) => (
                                    <FormItem>
                                        <FormLabel>{t('securityKeyNameLabel')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder={t('securityKeyNamePlaceholder')}
                                                disabled={isRegistering}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={registerForm.control}
                                name="password"
                                render={({ field }: FieldProps) => (
                                    <FormItem>
                                        <FormLabel>{t('password')}</FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...field} 
                                                type="password" 
                                                disabled={isRegistering}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    className="border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => {
                                        registerForm.reset();
                                        setShowRegisterDialog(false);
                                    }}
                                    disabled={isRegistering}
                                >
                                    {t('cancel')}
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isRegistering}
                                    className={cn(
                                        "min-w-[100px]",
                                        isRegistering && "cursor-not-allowed opacity-50"
                                    )}
                                >
                                    {isRegistering ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('registering')}
                                        </>
                                    ) : (
                                        t('securityKeyRegister')
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedSecurityKey} onOpenChange={(open) => !open && setSelectedSecurityKey(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-4 w-4" />
                            Remove Security Key
                        </DialogTitle>
                        <DialogDescription>
                            Enter your password to remove the security key "{selectedSecurityKey?.name}"
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...deleteForm}>
                        <form onSubmit={deleteForm.handleSubmit(handleDeleteSecurityKey)} className="space-y-4">
                            <FormField
                                control={deleteForm.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('password')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="password"
                                                disabled={deleteInProgress}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    className="border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => {
                                        deleteForm.reset();
                                        setSelectedSecurityKey(null);
                                    }}
                                    disabled={deleteInProgress}
                                >
                                    {t('cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={deleteInProgress}
                                >
                                    {deleteInProgress ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('securityKeyRemoving')}
                                        </>
                                    ) : (
                                        t('securityKeyRemove')
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={show2FADialog} onOpenChange={(open) => !open && setShow2FADialog(false)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Two-Factor Authentication Required</DialogTitle>
                        <DialogDescription>
                            Please enter your two-factor authentication code to remove the security key
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...deleteForm}>
                        <form onSubmit={deleteForm.handleSubmit(handle2FASubmit)} className="space-y-4">
                            <FormField
                                control={deleteForm.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Two-Factor Code</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="text"
                                                placeholder="Enter your 6-digit code"
                                                disabled={deleteInProgress}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter>
                                <Button
                                    type="button"
                                    className="border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                                    onClick={() => {
                                        deleteForm.reset();
                                        setShow2FADialog(false);
                                        setPendingDeleteCredentialId(null);
                                        setPendingDeletePassword(null);
                                    }}
                                    disabled={deleteInProgress}
                                >
                                    {t('cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={deleteInProgress}
                                >
                                    {deleteInProgress ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t('securityKeyRemoving')}
                                        </>
                                    ) : (
                                        t('securityKeyRemove')
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
} 