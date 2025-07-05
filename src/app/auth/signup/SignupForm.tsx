"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { SignUpResponse } from "@server/routers/auth";
import { useRouter } from "next/navigation";
import { passwordSchema } from "@server/auth/passwordSchema";
import { AxiosResponse } from "axios";
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import Image from "next/image";
import { cleanRedirect } from "@app/lib/cleanRedirect";
import { useTranslations } from "next-intl";
import { GetInviteDetailsResponse } from "@server/routers/user/getInviteDetails";
import { Check, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@app/lib/cn";

type SignupFormProps = {
    redirect?: string;
    inviteId?: string;
    inviteToken?: string;
    isValidInvite: boolean;
    isInvite: boolean;
};

// Password strength calculation
const calculatePasswordStrength = (password: string) => {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[~!`@#$%^&*()_\-+={}[\]|\\:;"'<>,.\/?]/.test(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;
    let strength: "weak" | "medium" | "strong" = "weak";
    let color = "bg-red-500";
    let percentage = 0;

    if (score >= 5) {
        strength = "strong";
        color = "bg-green-500";
        percentage = 100;
    } else if (score >= 3) {
        strength = "medium";
        color = "bg-yellow-500";
        percentage = 60;
    } else if (score >= 1) {
        strength = "weak";
        color = "bg-red-500";
        percentage = 30;
    }

    return { requirements, strength, color, percentage, score };
};

const formSchema = z
    .object({
        name: z.string().optional(),
        email: z.string().email({ message: "Invalid email address" }),
        password: passwordSchema,
        confirmPassword: passwordSchema
    })
    .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match"
    });

export default function SignupForm({
    redirect,
    inviteId,
    inviteToken,
    isValidInvite,
    isInvite
}: SignupFormProps) {
    const router = useRouter();
    const api = createApiClient(useEnvContext());
    const t = useTranslations();

    const [loading, setLoading] = useState(false);
    const [loadingInviteDetails, setLoadingInviteDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordValue, setPasswordValue] = useState("");
    const [confirmPasswordValue, setConfirmPasswordValue] = useState("");

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: ""
        },
        mode: "onChange" // Enable real-time validation
    });

    const passwordStrength = calculatePasswordStrength(passwordValue);
    const doPasswordsMatch = passwordValue.length > 0 && confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue;

    // Fetch invite details if coming from a valid invite link
    useEffect(() => {
        if (inviteId && inviteToken && isValidInvite) {
            setLoadingInviteDetails(true);
            api.get<AxiosResponse<GetInviteDetailsResponse>>(`/invite/details?token=${inviteId}-${inviteToken}`)
                .then((res) => {
                    if (res.status === 200) {
                        const email = res.data.data.email;
                        setInviteEmail(email);
                        form.setValue("email", email);
                    }
                })
                .catch((e) => {
                    console.error("Failed to fetch invite details:", e);
                })
                .finally(() => {
                    setLoadingInviteDetails(false);
                });
        }
    }, [inviteId, inviteToken, isValidInvite, api, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const { name, email, password } = values;

        setLoading(true);
        const res = await api
            .put<AxiosResponse<SignUpResponse>>("/auth/signup", {
                name,
                email,
                password,
                inviteId,
                inviteToken
            })
            .catch((e) => {
                console.error(e);
                setError(
                    formatAxiosError(e, t('signupError'))
                );
            });

        if (res && res.status === 200) {
            setError(null);

            if (res.data?.data?.emailVerificationRequired) {
                if (redirect) {
                    const safe = cleanRedirect(redirect);
                    router.push(`/auth/verify-email?redirect=${safe}`);
                } else {
                    router.push("/auth/verify-email");
                }
                return;
            }

            if (redirect) {
                const safe = cleanRedirect(redirect);
                router.replace(safe);
            } else {
                router.replace("/setup");
            }
            return;
        }

        setLoading(false);
    }

    // Show invalid invite card
    if (isInvite && !isValidInvite && !loading) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader>
                    <div className="flex flex-row items-center justify-center">
                        <Image
                            src={`/logo/pangolin_orange.svg`}
                            alt={t('pangolinLogoAlt')}
                            width="100"
                            height="100"
                        />
                    </div>
                    <div className="text-center space-y-1">
                        <CardTitle className="text-2xl font-bold">
                            {t('inviteInvalid')}
                        </CardTitle>
                        <CardDescription>
                            {t('inviteInvalidDescription')}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-center space-y-4">
                        <p className="text-muted-foreground">
                            {t('inviteErrorNotValid')}
                        </p>
                        <ul className="list-disc list-inside text-sm space-y-2 text-left">
                            <li>{t('inviteErrorExpired')}</li>
                            <li>{t('inviteErrorRevoked')}</li>
                            <li>{t('inviteErrorTypo')}</li>
                        </ul>
                        <Button 
                            onClick={() => router.push('/')}
                            className="mt-4"
                        >
                            {t('goHome')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <div className="flex flex-row items-center justify-center">
                    <Image
                        src={`/logo/pangolin_orange.svg`}
                        alt={t('pangolinLogoAlt')}
                        width="100"
                        height="100"
                    />
                </div>
                <div className="text-center space-y-1">
                    <h1 className="text-2xl font-bold mt-1">
                        {t('welcome')}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {t('authCreateAccount')}
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('name')}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                            }}
                                            autoComplete="given-name"
                                            tabIndex={1}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('email')}</FormLabel>
                                    <FormControl>
                                        <Input 
                                            {...field}
                                            onChange={(e) => {
                                                if (!isInvite) {
                                                    field.onChange(e);
                                                }
                                            }}
                                            readOnly={isInvite}
                                            disabled={loadingInviteDetails}
                                            className={isInvite ? "bg-muted" : ""}
                                            autoComplete="email"
                                            tabIndex={2}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                    {isInvite && inviteEmail && (
                                        <p className="text-sm text-muted-foreground">
                                            {t('inviteEmailPreFilled')}
                                        </p>
                                    )}
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center gap-2">
                                        <FormLabel>{t('password')}</FormLabel>
                                        {passwordStrength.strength === "strong" && (
                                            <Check className="h-4 w-4 text-green-500" />
                                        )}
                                    </div>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    setPasswordValue(e.target.value);
                                                }}
                                                className={cn(
                                                    "pr-10",
                                                    passwordStrength.strength === "strong" && "border-green-500 focus-visible:ring-green-500",
                                                    passwordStrength.strength === "medium" && "border-yellow-500 focus-visible:ring-yellow-500",
                                                    passwordStrength.strength === "weak" && passwordValue.length > 0 && "border-red-500 focus-visible:ring-red-500"
                                                )}
                                                autoComplete="new-password"
                                                tabIndex={3}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                tabIndex={-1}
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    
                                    {passwordValue.length > 0 && (
                                        <div className="space-y-3 mt-2">
                                            {/* Password Strength Meter */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium text-gray-700">Password strength</span>
                                                    <span className={cn(
                                                        "text-sm font-semibold",
                                                        passwordStrength.strength === "strong" && "text-green-600",
                                                        passwordStrength.strength === "medium" && "text-yellow-600",
                                                        passwordStrength.strength === "weak" && "text-red-600"
                                                    )}>
                                                        {passwordStrength.strength.charAt(0).toUpperCase() + passwordStrength.strength.slice(1)}
                                                    </span>
                                                </div>
                                                <Progress 
                                                    value={passwordStrength.percentage} 
                                                    className="h-2"
                                                />
                                            </div>
                                            
                                            {/* Requirements Checklist */}
                                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                                <div className="text-sm font-medium text-gray-700 mb-2">Requirements:</div>
                                                <div className="grid grid-cols-1 gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        {passwordStrength.requirements.length ? (
                                                            <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                        ) : (
                                                            <X className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                        )}
                                                        <span className={cn(
                                                            "text-sm",
                                                            passwordStrength.requirements.length ? "text-green-700" : "text-gray-600"
                                                        )}>
                                                            8+ characters
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {passwordStrength.requirements.uppercase ? (
                                                            <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                        ) : (
                                                            <X className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                        )}
                                                        <span className={cn(
                                                            "text-sm",
                                                            passwordStrength.requirements.uppercase ? "text-green-700" : "text-gray-600"
                                                        )}>
                                                            Uppercase letter (A-Z)
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {passwordStrength.requirements.lowercase ? (
                                                            <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                        ) : (
                                                            <X className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                        )}
                                                        <span className={cn(
                                                            "text-sm",
                                                            passwordStrength.requirements.lowercase ? "text-green-700" : "text-gray-600"
                                                        )}>
                                                            Lowercase letter (a-z)
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {passwordStrength.requirements.number ? (
                                                            <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                        ) : (
                                                            <X className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                        )}
                                                        <span className={cn(
                                                            "text-sm",
                                                            passwordStrength.requirements.number ? "text-green-700" : "text-gray-600"
                                                        )}>
                                                            Number (0-9)
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {passwordStrength.requirements.special ? (
                                                            <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                                        ) : (
                                                            <X className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                        )}
                                                        <span className={cn(
                                                            "text-sm",
                                                            passwordStrength.requirements.special ? "text-green-700" : "text-gray-600"
                                                        )}>
                                                            Special character (!@#$%...)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Only show FormMessage when not showing our custom requirements */}
                                    {passwordValue.length === 0 && <FormMessage />}
                                </FormItem>
                            )}
                        />
                        
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center gap-2">
                                        <FormLabel>{t('confirmPassword')}</FormLabel>
                                        {doPasswordsMatch && (
                                            <Check className="h-4 w-4 text-green-500" />
                                        )}
                                    </div>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    setConfirmPasswordValue(e.target.value);
                                                }}
                                                className={cn(
                                                    "pr-10",
                                                    doPasswordsMatch && "border-green-500 focus-visible:ring-green-500",
                                                    confirmPasswordValue.length > 0 && !doPasswordsMatch && "border-red-500 focus-visible:ring-red-500"
                                                )}
                                                autoComplete="new-password"
                                                tabIndex={4}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                tabIndex={-1}
                                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    {confirmPasswordValue.length > 0 && !doPasswordsMatch && (
                                        <p className="text-sm text-red-600 mt-1">
                                            Passwords do not match
                                        </p>
                                    )}
                                    {/* Only show FormMessage when field is empty */}
                                    {confirmPasswordValue.length === 0 && <FormMessage />}
                                </FormItem>
                            )}
                        />

                        <Button 
                            type="submit" 
                            className="w-full"
                            disabled={loading || loadingInviteDetails}
                            tabIndex={5}
                        >
                            {loading ? t('creatingAccount') : t('createAccount')}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
