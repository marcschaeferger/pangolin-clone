"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { LockIcon, Binary, Key, User } from "lucide-react";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@app/components/ui/input-otp";
import api from "@app/api";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@app/components/ui/alert";
import { formatAxiosError } from "@app/lib/utils";
import { AxiosResponse } from "axios";
import LoginForm from "@app/components/LoginForm";
import { AuthWithPasswordResponse } from "@server/routers/resource";
import { redirect } from "next/dist/server/api-utils";
import ResourceAccessDenied from "./ResourceAccessDenied";

const pinSchema = z.object({
    pin: z
        .string()
        .length(6, { message: "PIN must be exactly 6 digits" })
        .regex(/^\d+$/, { message: "PIN must only contain numbers" }),
});

const passwordSchema = z.object({
    password: z
        .string()
        .min(1, { message: "Password must be at least 1 character long" }),
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
            pin: "",
        },
    });

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            password: "",
        },
    });

    const onPinSubmit = (values: z.infer<typeof pinSchema>) => {
        setLoadingLogin(true);
        api.post<AxiosResponse<AuthWithPasswordResponse>>(
            `/auth/resource/${props.resource.id}/pincode`,
            { pincode: values.pin },
        )
            .then((res) => {
                const session = res.data.data.session;
                if (session) {
                    window.location.href = props.redirect;
                }
            })
            .catch((e) => {
                console.error(e);
                setPincodeError(
                    formatAxiosError(e, "Failed to authenticate with pincode"),
                );
            })
            .then(() => setLoadingLogin(false));
    };

    const onPasswordSubmit = (values: z.infer<typeof passwordSchema>) => {
        setLoadingLogin(true);
        api.post<AxiosResponse<AuthWithPasswordResponse>>(
            `/auth/resource/${props.resource.id}/password`,
            {
                password: values.password,
            },
        )
            .then((res) => {
                const session = res.data.data.session;
                if (session) {
                    window.location.href = props.redirect;
                }
            })
            .catch((e) => {
                console.error(e);
                setPasswordError(
                    formatAxiosError(e, "Failed to authenticate with password"),
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
                                        <Form {...pinForm}>
                                            <form
                                                onSubmit={pinForm.handleSubmit(
                                                    onPinSubmit,
                                                )}
                                                className="space-y-4"
                                            >
                                                <FormField
                                                    control={pinForm.control}
                                                    name="pin"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>
                                                                6-digit PIN Code
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
                                    </TabsContent>
                                )}
                                {props.methods.password && (
                                    <TabsContent
                                        value="password"
                                        className={`${numMethods <= 1 ? "mt-0" : ""}`}
                                    >
                                        <Form {...passwordForm}>
                                            <form
                                                onSubmit={passwordForm.handleSubmit(
                                                    onPasswordSubmit,
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
