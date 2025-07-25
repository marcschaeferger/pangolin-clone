"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@app/components/ui/button";
import { Input } from "@app/components/ui/input";
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
} from "@app/components/ui/card";
import { Alert, AlertDescription } from "@app/components/ui/alert";
import { LoginResponse } from "@server/routers/auth";
import { useRouter } from "next/navigation";
import { AxiosResponse } from "axios";
import { formatAxiosError } from "@app/lib/api";
import { LockIcon, FingerprintIcon, User, Key, Mail } from "lucide-react";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot
} from "./ui/input-otp";
import Link from "next/link";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import Image from "next/image";
import { GenerateOidcUrlResponse } from "@server/routers/idp";
import { Separator } from "./ui/separator";
import { useTranslations } from "next-intl";
import { startAuthentication } from "@simplewebauthn/browser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export type LoginFormIDP = {
    idpId: number;
    name: string;
};

type LoginFormProps = {
    redirect?: string;
    onLogin?: () => void | Promise<void>;
    idps?: LoginFormIDP[];
};

export default function LoginForm({ redirect, onLogin, idps }: LoginFormProps) {
    const router = useRouter();
    const { env } = useEnvContext();
    const api = createApiClient({ env });
    const t = useTranslations();

    const hasIdp = idps && idps.length > 0;

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [mfaRequested, setMfaRequested] = useState(false);
    const [showSecurityKeyPrompt, setShowSecurityKeyPrompt] = useState(false);
    const [activeTab, setActiveTab] = useState<string>(hasIdp ? "oidc" : "password");

    // Calculate available methods
    const availableMethods = {
        oidc: hasIdp, // SSO first when available
        password: true, // Always available
        passkey: true,  // Always available (user can try)
    };

    const numMethods = Object.values(availableMethods).filter(Boolean).length;

    const formSchema = z.object({
        email: z.string().email({ message: t("emailInvalid") }),
        password: z.string().min(8, { message: t("passwordRequirementsChars") })
    });

    const mfaSchema = z.object({
        code: z.string().length(6, { message: t("pincodeInvalid") })
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: ""
        }
    });

    const mfaForm = useForm<z.infer<typeof mfaSchema>>({
        resolver: zodResolver(mfaSchema),
        defaultValues: {
            code: ""
        }
    });

    async function initiateSecurityKeyAuth() {
        setShowSecurityKeyPrompt(true);
        setLoading(true);
        setError(null);

        try {
            // Start WebAuthn authentication without email
            const startRes = await api.post(
                "/auth/security-key/authenticate/start",
                {}
            );

            if (!startRes) {
                setError(
                    t("securityKeyAuthError", {
                        defaultValue:
                            "Failed to start security key authentication"
                    })
                );
                return;
            }

            const { tempSessionId, ...options } = startRes.data.data;

            // Perform WebAuthn authentication
            try {
                const credential = await startAuthentication(options);

                // Verify authentication
                const verifyRes = await api.post(
                    "/auth/security-key/authenticate/verify",
                    { credential },
                    {
                        headers: {
                            "X-Temp-Session-Id": tempSessionId
                        }
                    }
                );

                if (verifyRes) {
                    if (onLogin) {
                        await onLogin();
                    }
                }
            } catch (error: any) {
                if (error.name === "NotAllowedError") {
                    if (error.message.includes("denied permission")) {
                        setError(
                            t("securityKeyPermissionDenied", {
                                defaultValue:
                                    "Please allow access to your security key to continue signing in."
                            })
                        );
                    } else {
                        setError(
                            t("securityKeyRemovedTooQuickly", {
                                defaultValue:
                                    "Please keep your security key connected until the sign-in process completes."
                            })
                        );
                    }
                } else if (error.name === "NotSupportedError") {
                    setError(
                        t("securityKeyNotSupported", {
                            defaultValue:
                                "Your security key may not be compatible. Please try a different security key."
                        })
                    );
                } else {
                    setError(
                        t("securityKeyUnknownError", {
                            defaultValue:
                                "There was a problem using your security key. Please try again."
                        })
                    );
                }
            }
        } catch (e: any) {
            if (e.isAxiosError) {
                setError(
                    formatAxiosError(
                        e,
                        t("securityKeyAuthError", {
                            defaultValue:
                                "Failed to authenticate with security key"
                        })
                    )
                );
            } else {
                console.error(e);
                setError(
                    e.message ||
                        t("securityKeyAuthError", {
                            defaultValue:
                                "Failed to authenticate with security key"
                        })
                );
            }
        } finally {
            setLoading(false);
            setShowSecurityKeyPrompt(false);
        }
    }

    async function onSubmit(values: any) {
        const { email, password } = form.getValues();
        const { code } = mfaForm.getValues();

        setLoading(true);
        setError(null);
        setShowSecurityKeyPrompt(false);

        try {
            const res = await api.post<AxiosResponse<LoginResponse>>(
                "/auth/login",
                {
                    email,
                    password,
                    code
                }
            );

            const data = res.data.data;

            if (data?.useSecurityKey) {
                await initiateSecurityKeyAuth();
                return;
            }

            if (data?.codeRequested) {
                setMfaRequested(true);
                setLoading(false);
                mfaForm.reset();
                return;
            }

            if (data?.emailVerificationRequired) {
                if (redirect) {
                    router.push(`/auth/verify-email?redirect=${redirect}`);
                } else {
                    router.push("/auth/verify-email");
                }
                return;
            }

            if (data?.twoFactorSetupRequired) {
                const setupUrl = `/auth/2fa/setup?email=${encodeURIComponent(email)}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`;
                router.push(setupUrl);
                return;
            }

            if (onLogin) {
                await onLogin();
            }
        } catch (e: any) {
            if (e.isAxiosError) {
                const errorMessage = formatAxiosError(
                    e,
                    t("loginError", {
                        defaultValue: "Failed to log in"
                    })
                );
                setError(errorMessage);
                return;
            } else {
                console.error(e);
                setError(
                    e.message ||
                        t("loginError", {
                            defaultValue: "Failed to log in"
                        })
                );
                return;
            }
        } finally {
            setLoading(false);
        }
    }

    async function loginWithIdp(idpId: number) {
        try {
            const res = await api.post<AxiosResponse<GenerateOidcUrlResponse>>(
                `/auth/idp/${idpId}/oidc/generate-url`,
                {
                    redirectUrl: redirect || "/"
                }
            );

            console.log(res);

            if (!res) {
                setError(t("loginError"));
                return;
            }

            const data = res.data.data;
            window.location.href = data.redirectUrl;
        } catch (e) {
            console.error(formatAxiosError(e));
        }
    }

    // If MFA is requested, show the MFA form
    if (mfaRequested) {
        return (
            <div className="space-y-4">
                <div className="text-center">
                    <h3 className="text-lg font-medium">{t("otpAuth")}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t("otpAuthDescription")}
                    </p>
                </div>
                <Form {...mfaForm}>
                    <form
                        onSubmit={mfaForm.handleSubmit(onSubmit)}
                        className="space-y-4"
                        id="form"
                    >
                        <FormField
                            control={mfaForm.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <div className="flex justify-center">
                                            <InputOTP
                                                maxLength={6}
                                                {...field}
                                                pattern={
                                                    REGEXP_ONLY_DIGITS_AND_CHARS
                                                }
                                                onChange={(value: string) => {
                                                    field.onChange(value);
                                                    if (value.length === 6) {
                                                        mfaForm.handleSubmit(
                                                            onSubmit
                                                        )();
                                                    }
                                                }}
                                            >
                                                <InputOTPGroup>
                                                    <InputOTPSlot index={0} />
                                                    <InputOTPSlot index={1} />
                                                    <InputOTPSlot index={2} />
                                                    <InputOTPSlot index={3} />
                                                    <InputOTPSlot index={4} />
                                                    <InputOTPSlot index={5} />
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

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4">
                    <Button
                        type="submit"
                        form="form"
                        className="w-full"
                        loading={loading}
                        disabled={loading}
                    >
                        {t("otpAuthSubmit")}
                    </Button>

                    <Button
                        type="button"
                        className="w-full"
                        variant="outline"
                        onClick={() => {
                            setMfaRequested(false);
                            mfaForm.reset();
                        }}
                    >
                        {t("otpAuthBack")}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {showSecurityKeyPrompt && (
                <Alert>
                    <FingerprintIcon className="w-5 h-5 mr-2" />
                    <AlertDescription>
                        {t("securityKeyPrompt", {
                            defaultValue:
                                "Please verify your identity using your security key. Make sure your security key is connected and ready."
                        })}
                    </AlertDescription>
                </Alert>
            )}

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                orientation="horizontal"
            >
                {numMethods > 1 && (
                    <TabsList
                        className={`grid w-full ${
                            numMethods === 1
                                ? "grid-cols-1"
                                : numMethods === 2
                                  ? "grid-cols-2"
                                  : "grid-cols-3"
                        }`}
                    >
                        {availableMethods.oidc && (
                            <TabsTrigger value="oidc">
                                <User className="w-4 h-4 mr-1" />
                                SSO
                            </TabsTrigger>
                        )}
                        {availableMethods.password && (
                            <TabsTrigger value="password">
                                <Key className="w-4 h-4 mr-1" />
                                {t("password")}
                            </TabsTrigger>
                        )}
                        {availableMethods.passkey && (
                            <TabsTrigger value="passkey">
                                <FingerprintIcon className="w-4 h-4 mr-1" />
                                Passkey
                            </TabsTrigger>
                        )}
                    </TabsList>
                )}

                {availableMethods.oidc && (
                    <TabsContent
                        value="oidc"
                        className={`${numMethods <= 1 ? "mt-0" : ""}`}
                    >
                        <div className="space-y-4">
                            <div className="text-center">
                                <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-medium">
                                    Continue with SSO
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Sign in using your organization's single sign-on provider
                                </p>
                            </div>

                            {idps?.map((idp) => (
                                <Button
                                    key={idp.idpId}
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        loginWithIdp(idp.idpId);
                                    }}
                                >
                                    {idp.name}
                                </Button>
                            ))}
                        </div>
                    </TabsContent>
                )}

                {availableMethods.password && (
                    <TabsContent
                        value="password"
                        className={`${numMethods <= 1 ? "mt-0" : ""}`}
                    >
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                id="password-form"
                            >
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t("email")}</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                {t("password")}
                                            </FormLabel>
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

                                <div className="text-center">
                                    <Link
                                        href={`/auth/reset-password${form.getValues().email ? `?email=${form.getValues().email}` : ""}`}
                                        className="text-sm text-muted-foreground"
                                    >
                                        {t("passwordForgot")}
                                    </Link>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading}
                                    loading={loading}
                                >
                                    {t("login")}
                                </Button>
                            </form>
                        </Form>
                    </TabsContent>
                )}

                {availableMethods.passkey && (
                    <TabsContent
                        value="passkey"
                        className={`${numMethods <= 1 ? "mt-0" : ""}`}
                    >
                        <div className="space-y-4">
                            <div className="text-center">
                                <FingerprintIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-medium">
                                    Sign in with Passkey
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Use your security key or biometric authentication
                                </p>
                            </div>

                            <Button
                                type="button"
                                className="w-full"
                                onClick={initiateSecurityKeyAuth}
                                loading={loading}
                                disabled={loading || showSecurityKeyPrompt}
                            >
                                <FingerprintIcon className="w-4 h-4 mr-2" />
                                Sign in with Passkey
                            </Button>
                        </div>
                    </TabsContent>
                )}
            </Tabs>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
