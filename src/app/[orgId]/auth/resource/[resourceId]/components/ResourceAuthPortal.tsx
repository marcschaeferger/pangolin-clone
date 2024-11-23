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

const pinSchema = z.object({
    pin: z
        .string()
        .length(6, { message: "PIN must be exactly 6 digits" })
        .regex(/^\d+$/, { message: "PIN must only contain numbers" }),
});

const passwordSchema = z.object({
    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters long" }),
});

const userSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export default function ResourceAuthPortal() {
    const [activeTab, setActiveTab] = useState("pin");

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
        console.log("Password authentication", values);
        // Implement password authentication logic here
    };

    const handleSSOAuth = () => {
        console.log("SSO authentication");
        // Implement SSO authentication logic here
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Authentication Required</CardTitle>
                    <CardDescription>
                        Choose your preferred method
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="pin">
                                <Binary className="w-4 h-4 mr-1" /> PIN
                            </TabsTrigger>
                            <TabsTrigger value="password">
                                <Key className="w-4 h-4 mr-1" /> Password
                            </TabsTrigger>
                            <TabsTrigger value="sso">
                                <User className="w-4 h-4 mr-1" /> User
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="pin">
                            <Form {...pinForm}>
                                <form
                                    onSubmit={pinForm.handleSubmit(onPinSubmit)}
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
                                                                    index={0}
                                                                />
                                                                <InputOTPSlot
                                                                    index={1}
                                                                />
                                                                <InputOTPSlot
                                                                    index={2}
                                                                />
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
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full">
                                        <LockIcon className="w-4 h-4 mr-2" />
                                        Login with PIN
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>
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
                                                <FormLabel>Password</FormLabel>
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
                                    <Button type="submit" className="w-full">
                                        <LockIcon className="w-4 h-4 mr-2" />
                                        Login with Password
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>
                        <TabsContent value="sso">
                            <Form {...userForm}>
                                <form
                                    onSubmit={userForm.handleSubmit(
                                        (values) => {
                                            console.log(
                                                "User authentication",
                                                values,
                                            );
                                            // Implement user authentication logic here
                                        },
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
                                                <FormLabel>Password</FormLabel>
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
                                    <Button type="submit" className="w-full">
                                        <LockIcon className="w-4 h-4 mr-2" />
                                        Login as User
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>
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
