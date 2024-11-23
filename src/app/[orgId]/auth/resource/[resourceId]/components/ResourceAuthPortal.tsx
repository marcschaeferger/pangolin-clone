"use client";

import { useState } from "react";
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
import { LockIcon, UserIcon, Binary, Key, User } from "lucide-react";
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
import { LoginResponse } from "@server/routers/auth";

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

const userSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address" }),
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

    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [userError, setUserError] = useState<string | null>(null);

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

    const getColLength = () => {
        let colLength = 0;
        if (props.methods.pincode) colLength++;
        if (props.methods.password) colLength++;
        if (props.methods.sso) colLength++;
        return colLength;
    };

    const [numMethods, setNumMethods] = useState(getColLength());

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

    const userForm = useForm<z.infer<typeof userSchema>>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onPinSubmit = (values: z.infer<typeof pinSchema>) => {
        console.log("PIN authentication", values);
        // Implement PIN authentication logic here
    };

    const onPasswordSubmit = (values: z.infer<typeof passwordSchema>) => {
        api.post(`/resource/${props.resource.id}/auth/password`, {
            password: values.password,
        })
            .then((res) => {
                window.location.href = props.redirect;
            })
            .catch((e) => {
                console.error(e);
                setPasswordError(
                    formatAxiosError(e, "Failed to authenticate with password"),
                );
            });
    };

    const handleSSOAuth = (values: z.infer<typeof userSchema>) => {
        console.log("SSO authentication");

        api.post<AxiosResponse<LoginResponse>>("/auth/login", {
            email: values.email,
            password: values.password,
        })
            .then((res) => {
                // console.log(res)
                window.location.href = props.redirect;
            })
            .catch((e) => {
                console.error(e);
                setUserError(
                    formatAxiosError(e, "An error occurred while logging in"),
                );
            });
    };

    return (
        <div>
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
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        {numMethods > 1 && (
                            <TabsList
                                className={`grid w-full grid-cols-${numMethods}`}
                            >
                                {props.methods.pincode && (
                                    <TabsTrigger value="pin">
                                        <Binary className="w-4 h-4 mr-1" /> PIN
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
                                        <User className="w-4 h-4 mr-1" /> User
                                    </TabsTrigger>
                                )}
                            </TabsList>
                        )}
                        {props.methods.pincode && (
                            <TabsContent value="pin">
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
                                                        Enter 6-digit PIN
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="flex justify-center">
                                                            <InputOTP
                                                                maxLength={6}
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
                                        <Button
                                            type="submit"
                                            className="w-full"
                                        >
                                            <LockIcon className="w-4 h-4 mr-2" />
                                            Login with PIN
                                        </Button>
                                    </form>
                                </Form>
                            </TabsContent>
                        )}
                        {props.methods.password && (
                            <TabsContent value="password">
                                <Form {...passwordForm}>
                                    <form
                                        onSubmit={passwordForm.handleSubmit(
                                            onPasswordSubmit,
                                        )}
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={passwordForm.control}
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
                                        >
                                            <LockIcon className="w-4 h-4 mr-2" />
                                            Login with Password
                                        </Button>
                                    </form>
                                </Form>
                            </TabsContent>
                        )}
                        {props.methods.sso && (
                            <TabsContent value="sso">
                                <Form {...userForm}>
                                    <form
                                        onSubmit={userForm.handleSubmit(
                                            handleSSOAuth,
                                        )}
                                        className="space-y-4"
                                    >
                                        <FormField
                                            control={userForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter email"
                                                            type="email"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={userForm.control}
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
                                        {userError && (
                                            <Alert variant="destructive">
                                                <AlertDescription>
                                                    {userError}
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                        <Button
                                            type="submit"
                                            className="w-full"
                                        >
                                            <LockIcon className="w-4 h-4 mr-2" />
                                            Login as User
                                        </Button>
                                    </form>
                                </Form>
                            </TabsContent>
                        )}
                    </Tabs>
                </CardContent>
            </Card>
            {activeTab === "sso" && (
                <div className="flex justify-center mt-4">
                    <p className="text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <a href="#" className="underline">
                            Sign up
                        </a>
                    </p>
                </div>
            )}
        </div>
    );
}
