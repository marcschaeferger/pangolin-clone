"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import {
    LockIcon,
    Binary,
    Key,
    User,
    Send,
    ArrowLeft,
    ArrowRight,
    Lock
} from "lucide-react";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot
} from "@app/components/ui/input-otp";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@app/components/ui/alert";
import { formatAxiosError } from "@app/lib/utils";
import { AxiosResponse } from "axios";
import LoginForm from "@app/components/LoginForm";
import { AuthWithPasswordResponse } from "@server/routers/resource";
import { redirect } from "next/dist/server/api-utils";
import ResourceAccessDenied from "./ResourceAccessDenied";
import { createApiClient } from "@app/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { useToast } from "@app/hooks/useToast";

const pin = z
    .string()
    .length(6, { message: "PIN must be exactly 6 digits" })
    .regex(/^\d+$/, { message: "PIN must only contain numbers" });

const pinSchema = z.object({
    pin
});

const pinRequestOtpSchema = z.object({
    pin,
    email: z.string().email()
});

const pinOtpSchema = z.object({
    pin,
    email: z.string().email(),
    otp: z.string()
});

const password = z.string().min(1, {
    message: "Password must be at least 1 character long"
});

const passwordSchema = z.object({
    password
});

const passwordRequestOtpSchema = z.object({
    password,
    email: z.string().email()
});

const passwordOtpSchema = z.object({
    password,
    email: z.string().email(),
    otp: z.string()
});

type ResourceAuthPortalProps = {
    methods: {
        password: boolean;
        pincode: boolean;
        sso: boolean;
    };
    resource: {
        name: string;
        id: number;
    };
    redirect: string;
};

export default function ResourceAuthPortal(props: ResourceAuthPortalProps) {
    const router = useRouter();
    const { toast } = useToast();

    const getNumMethods = () => {
        let colLength = 0;
        if (props.methods.pincode) colLength++;
        if (props.methods.password) colLength++;
        if (props.methods.sso) colLength++;
        return colLength;
    };

    const [numMethods, setNumMethods] = useState(getNumMethods());

    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [pincodeError, setPincodeError] = useState<string | null>(null);
    const [accessDenied, setAccessDenied] = useState<boolean>(false);
    const [loadingLogin, setLoadingLogin] = useState(false);

    const [otpState, setOtpState] = useState<
        "idle" | "otp_requested" | "otp_sent"
    >("idle");

    const api = createApiClient(useEnvContext());

    function getDefaultSelectedMethod() {
        if (props.methods.sso) {
            return "sso";
        }

        if (props.methods.password) {
            return "password";
        }

        if (props.methods.pincode) {
            return "pin";
        }
    }

    const [activeTab, setActiveTab] = useState(getDefaultSelectedMethod());

    const pinForm = useForm<z.infer<typeof pinSchema>>({
        resolver: zodResolver(pinSchema),
        defaultValues: {
            pin: ""
        }
    });

    const pinRequestOtpForm = useForm<z.infer<typeof pinRequestOtpSchema>>({
        resolver: zodResolver(pinRequestOtpSchema),
        defaultValues: {
            pin: "",
            email: ""
        }
    });

    const pinOtpForm = useForm<z.infer<typeof pinOtpSchema>>({
        resolver: zodResolver(pinOtpSchema),
        defaultValues: {
            pin: "",
            email: "",
            otp: ""
        }
    });

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            password: ""
        }
    });

    const passwordRequestOtpForm = useForm<
        z.infer<typeof passwordRequestOtpSchema>
    >({
        resolver: zodResolver(passwordRequestOtpSchema),
        defaultValues: {
            password: "",
            email: ""
        }
    });

    const passwordOtpForm = useForm<z.infer<typeof passwordOtpSchema>>({
        resolver: zodResolver(passwordOtpSchema),
        defaultValues: {
            password: "",
            email: "",
            otp: ""
        }
    });

    const onPinSubmit = (values: any) => {
        setLoadingLogin(true);
        api.post<AxiosResponse<AuthWithPasswordResponse>>(
            `/auth/resource/${props.resource.id}/pincode`,
            { pincode: values.pin, email: values.email, otp: values.otp }
        )
            .then((res) => {
                setPincodeError(null);
                if (res.data.data.otpRequested) {
                    setOtpState("otp_requested");
                    pinRequestOtpForm.setValue("pin", values.pin);
                    return;
                } else if (res.data.data.otpSent) {
                    pinOtpForm.setValue("email", values.email);
                    pinOtpForm.setValue("pin", values.pin);
                    toast({
                        title: "OTP Sent",
                        description: `OTP sent to ${values.email}`
                    });
                    setOtpState("otp_sent");
                    return;
                }

                const session = res.data.data.session;
                if (session) {
                    window.location.href = props.redirect;
                }
            })
            .catch((e) => {
                console.error(e);
                setPincodeError(
                    formatAxiosError(e, "Failed to authenticate with pincode")
                );
            })
            .then(() => setLoadingLogin(false));
    };

    const resetPasswordForms = () => {
        passwordForm.reset();
        passwordRequestOtpForm.reset();
        passwordOtpForm.reset();
        setOtpState("idle");
        setPasswordError(null);
    };

    const resetPinForms = () => {
        pinForm.reset();
        pinRequestOtpForm.reset();
        pinOtpForm.reset();
        setOtpState("idle");
        setPincodeError(null);
    }

    const onPasswordSubmit = (values: any) => {
        setLoadingLogin(true);

        api.post<AxiosResponse<AuthWithPasswordResponse>>(
            `/auth/resource/${props.resource.id}/password`,
            {
                password: values.password,
                email: values.email,
                otp: values.otp
            }
        )
            .then((res) => {
                setPasswordError(null);
                if (res.data.data.otpRequested) {
                    setOtpState("otp_requested");
                    passwordRequestOtpForm.setValue(
                        "password",
                        values.password
                    );
                    return;
                } else if (res.data.data.otpSent) {
                    passwordOtpForm.setValue("email", values.email);
                    passwordOtpForm.setValue("password", values.password);
                    toast({
                        title: "OTP Sent",
                        description: `OTP sent to ${values.email}`
                    });
                    setOtpState("otp_sent");
                    return;
                }

                const session = res.data.data.session;
                if (session) {
                    window.location.href = props.redirect;
                }
            })
            .catch((e) => {
                console.error(e);
                setPasswordError(
                    formatAxiosError(e, "Failed to authenticate with password")
                );
            })
            .finally(() => setLoadingLogin(false));
    };

    async function handleSSOAuth() {
        let isAllowed = false;
        try {
            await api.get(`/resource/${props.resource.id}`);
            isAllowed = true;
        } catch (e) {
            setAccessDenied(true);
        }

        if (isAllowed) {
            window.location.href = props.redirect;
        }
    }

    return (
        <div>
            {!accessDenied ? (
                <div>
                    <div className="text-center mb-2">
                        <span className="text-sm text-muted-foreground">
                            Powered by Fossorial
                        </span>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Authentication Required</CardTitle>
                            <CardDescription>
                                {numMethods > 1
                                    ? `Choose your preferred method to access ${props.resource.name}`
                                    : `You must authenticate to access ${props.resource.name}`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                        {props.methods.pincode && (
                                            <TabsTrigger value="pin">
                                                <Binary className="w-4 h-4 mr-1" />{" "}
                                                PIN
                                            </TabsTrigger>
                                        )}
                                        {props.methods.password && (
                                            <TabsTrigger value="password">
                                                <Key className="w-4 h-4 mr-1" />{" "}
                                                Password
                                            </TabsTrigger>
                                        )}
                                        {props.methods.sso && (
                                            <TabsTrigger value="sso">
                                                <User className="w-4 h-4 mr-1" />{" "}
                                                User
                                            </TabsTrigger>
                                        )}
                                    </TabsList>
                                )}
                                {props.methods.pincode && (
                                    <TabsContent
                                        value="pin"
                                        className={`${numMethods <= 1 ? "mt-0" : ""}`}
                                    >
                                        {otpState === "idle" && (
                                            <Form {...pinForm}>
                                                <form
                                                    onSubmit={pinForm.handleSubmit(
                                                        onPinSubmit
                                                    )}
                                                    className="space-y-4"
                                                >
                                                    <FormField
                                                        control={
                                                            pinForm.control
                                                        }
                                                        name="pin"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    6-digit PIN
                                                                    Code
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <div className="flex justify-center">
                                                                        <InputOTP
                                                                            maxLength={
                                                                                6
                                                                            }
                                                                            {...field}
                                                                        >
                                                                            <InputOTPGroup className="flex">
                                                                                <InputOTPSlot
                                                                                    index={
                                                                                        0
                                                                                    }
                                                                                />
                                                                                <InputOTPSlot
                                                                                    index={
                                                                                        1
                                                                                    }
                                                                                />
                                                                                <InputOTPSlot
                                                                                    index={
                                                                                        2
                                                                                    }
                                                                                />
                                                                                <InputOTPSlot
                                                                                    index={
                                                                                        3
                                                                                    }
                                                                                />
                                                                                <InputOTPSlot
                                                                                    index={
                                                                                        4
                                                                                    }
                                                                                />
                                                                                <InputOTPSlot
                                                                                    index={
                                                                                        5
                                                                                    }
                                                                                />
                                                                            </InputOTPGroup>
                                                                        </InputOTP>
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    {pincodeError && (
                                                        <Alert variant="destructive">
                                                            <AlertDescription>
                                                                {pincodeError}
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                    <Button
                                                        type="submit"
                                                        className="w-full"
                                                        loading={loadingLogin}
                                                        disabled={loadingLogin}
                                                    >
                                                        <LockIcon className="w-4 h-4 mr-2" />
                                                        Login with PIN
                                                    </Button>
                                                </form>
                                            </Form>
                                        )}

                                        {otpState === "otp_requested" && (
                                            <Form {...pinRequestOtpForm}>
                                                <form
                                                    onSubmit={pinRequestOtpForm.handleSubmit(
                                                        onPinSubmit
                                                    )}
                                                    className="space-y-4"
                                                >
                                                    <FormField
                                                        control={
                                                            pinRequestOtpForm.control
                                                        }
                                                        name="email"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Email
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Enter email"
                                                                        type="email"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    A one-time
                                                                    code will be
                                                                    sent to this
                                                                    email.
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    {pincodeError && (
                                                        <Alert variant="destructive">
                                                            <AlertDescription>
                                                                {pincodeError}
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}

                                                    <Button
                                                        type="submit"
                                                        className="w-full"
                                                        loading={loadingLogin}
                                                        disabled={loadingLogin}
                                                    >
                                                        <Send className="w-4 h-4 mr-2" />
                                                        Send OTP
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        className="w-full"
                                                        variant={"outline"}
                                                        onClick={() =>
                                                            resetPinForms()
                                                        }
                                                    >
                                                        Back to PIN
                                                    </Button>
                                                </form>
                                            </Form>
                                        )}

                                        {otpState === "otp_sent" && (
                                            <Form {...pinOtpForm}>
                                                <form
                                                    onSubmit={pinOtpForm.handleSubmit(
                                                        onPinSubmit
                                                    )}
                                                    className="space-y-4"
                                                >
                                                    <FormField
                                                        control={
                                                            pinOtpForm.control
                                                        }
                                                        name="otp"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    One-Time
                                                                    Password
                                                                    (OTP)
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Enter OTP"
                                                                        type="otp"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    {pincodeError && (
                                                        <Alert variant="destructive">
                                                            <AlertDescription>
                                                                {pincodeError}
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}

                                                    <Button
                                                        type="submit"
                                                        className="w-full"
                                                        loading={loadingLogin}
                                                        disabled={loadingLogin}
                                                    >
                                                        <LockIcon className="w-4 h-4 mr-2" />
                                                        Submit OTP
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        className="w-full"
                                                        variant={"outline"}
                                                        onClick={() => {
                                                            setOtpState(
                                                                "otp_requested"
                                                            );
                                                            pinOtpForm.reset();
                                                        }}
                                                    >
                                                        Resend OTP
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        className="w-full"
                                                        variant={"outline"}
                                                        onClick={() =>
                                                            resetPinForms()
                                                        }
                                                    >
                                                        Back to PIN
                                                    </Button>
                                                </form>
                                            </Form>
                                        )}
                                    </TabsContent>
                                )}
                                {props.methods.password && (
                                    <TabsContent
                                        value="password"
                                        className={`${numMethods <= 1 ? "mt-0" : ""}`}
                                    >
                                        {otpState === "idle" && (
                                            <Form {...passwordForm}>
                                                <form
                                                    onSubmit={passwordForm.handleSubmit(
                                                        onPasswordSubmit
                                                    )}
                                                    className="space-y-4"
                                                >
                                                    <FormField
                                                        control={
                                                            passwordForm.control
                                                        }
                                                        name="password"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Password
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Enter password"
                                                                        type="password"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    {passwordError && (
                                                        <Alert variant="destructive">
                                                            <AlertDescription>
                                                                {passwordError}
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}

                                                    <Button
                                                        type="submit"
                                                        className="w-full"
                                                        loading={loadingLogin}
                                                        disabled={loadingLogin}
                                                    >
                                                        <LockIcon className="w-4 h-4 mr-2" />
                                                        Login with Password
                                                    </Button>
                                                </form>
                                            </Form>
                                        )}

                                        {otpState === "otp_requested" && (
                                            <Form {...passwordRequestOtpForm}>
                                                <form
                                                    onSubmit={passwordRequestOtpForm.handleSubmit(
                                                        onPasswordSubmit
                                                    )}
                                                    className="space-y-4"
                                                >
                                                    <FormField
                                                        control={
                                                            passwordRequestOtpForm.control
                                                        }
                                                        name="email"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Email
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Enter email"
                                                                        type="email"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                                <FormDescription>
                                                                    A one-time
                                                                    code will be
                                                                    sent to this
                                                                    email.
                                                                </FormDescription>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    {passwordError && (
                                                        <Alert variant="destructive">
                                                            <AlertDescription>
                                                                {passwordError}
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}

                                                    <Button
                                                        type="submit"
                                                        className="w-full"
                                                        loading={loadingLogin}
                                                        disabled={loadingLogin}
                                                    >
                                                        <Send className="w-4 h-4 mr-2" />
                                                        Send OTP
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        className="w-full"
                                                        variant={"outline"}
                                                        onClick={() =>
                                                            resetPasswordForms()
                                                        }
                                                    >
                                                        Back to Password
                                                    </Button>
                                                </form>
                                            </Form>
                                        )}

                                        {otpState === "otp_sent" && (
                                            <Form {...passwordOtpForm}>
                                                <form
                                                    onSubmit={passwordOtpForm.handleSubmit(
                                                        onPasswordSubmit
                                                    )}
                                                    className="space-y-4"
                                                >
                                                    <FormField
                                                        control={
                                                            passwordOtpForm.control
                                                        }
                                                        name="otp"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    One-Time
                                                                    Password
                                                                    (OTP)
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        placeholder="Enter OTP"
                                                                        type="otp"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    {passwordError && (
                                                        <Alert variant="destructive">
                                                            <AlertDescription>
                                                                {passwordError}
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}

                                                    <Button
                                                        type="submit"
                                                        className="w-full"
                                                        loading={loadingLogin}
                                                        disabled={loadingLogin}
                                                    >
                                                        <LockIcon className="w-4 h-4 mr-2" />
                                                        Submit OTP
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        className="w-full"
                                                        variant={"outline"}
                                                        onClick={() => {
                                                            setOtpState(
                                                                "otp_requested"
                                                            );
                                                            passwordOtpForm.reset();
                                                        }}
                                                    >
                                                        Resend OTP
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        className="w-full"
                                                        variant={"outline"}
                                                        onClick={() =>
                                                            resetPasswordForms()
                                                        }
                                                    >
                                                        Back to Password
                                                    </Button>
                                                </form>
                                            </Form>
                                        )}
                                    </TabsContent>
                                )}
                                {props.methods.sso && (
                                    <TabsContent
                                        value="sso"
                                        className={`${numMethods <= 1 ? "mt-0" : ""}`}
                                    >
                                        <LoginForm
                                            redirect={
                                                typeof window !== "undefined"
                                                    ? window.location.href
                                                    : ""
                                            }
                                            onLogin={async () =>
                                                await handleSSOAuth()
                                            }
                                        />
                                    </TabsContent>
                                )}
                            </Tabs>
                        </CardContent>
                    </Card>
                    {/* {activeTab === "sso" && (
                        <div className="flex justify-center mt-4">
                            <p className="text-sm text-muted-foreground">
                                Don't have an account?{" "}
                                <a href="#" className="underline">
                                    Sign up
                                </a>
                            </p>
                        </div>
                    )} */}
                </div>
            ) : (
                <ResourceAccessDenied />
            )}
        </div>
    );
}
