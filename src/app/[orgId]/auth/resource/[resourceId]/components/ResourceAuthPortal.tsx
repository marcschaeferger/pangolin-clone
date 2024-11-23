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
import { Label } from "@/components/ui/label";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { LockIcon, KeyIcon, UserIcon, Binary, Key, User } from "lucide-react";

const pinSchema = z.object({
    pin: z
        .string()
        .length(6, { message: "PIN must be exactly 6 digits" })
        .regex(/^\d+$/, { message: "PIN must only contain numbers" }),
});

const passwordSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters long" }),
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
                    <CardTitle>Welcome Back</CardTitle>
                    <CardDescription>
                        Choose your preferred login method
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
                                <User className="w-4 h-4 mr-1" /> SSO
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
                                                <FormLabel>Enter PIN</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter your 6-digit PIN"
                                                        type="password"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full">
                                        <KeyIcon className="w-4 h-4 mr-2" />
                                        Login with PIN
                                    </Button>
                                </form>
                            </Form>
                        </TabsContent>
                        <TabsContent value="password">
                            <Form {...passwordForm}>
                                <form
                                    onSubmit={passwordForm.handleSubmit(
                                        onPasswordSubmit
                                    )}
                                    className="space-y-4"
                                >
                                    <FormField
                                        control={passwordForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter your email"
                                                        type="email"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={passwordForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter your password"
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
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Click the button below to login with your
                                    organization's SSO provider.
                                </p>
                                <Button
                                    onClick={handleSSOAuth}
                                    className="w-full"
                                >
                                    <UserIcon className="w-4 h-4 mr-2" />
                                    Login with SSO
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <a href="#" className="underline">
                            Sign up
                        </a>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
