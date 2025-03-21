"use client";

import Image from "next/image";
import { Separator } from "@app/components/ui/separator";
import { useSupporterStatusContext } from "@app/hooks/useSupporterStatusContext";
import { useState } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@app/components/ui/popover";
import { Button } from "./ui/button";
import {
    Credenza,
    CredenzaBody,
    CredenzaClose,
    CredenzaContent,
    CredenzaDescription,
    CredenzaFooter,
    CredenzaHeader,
    CredenzaTitle
} from "./Credenza";
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
} from "./ui/form";
import { Input } from "./ui/input";
import { toast } from "@app/hooks/useToast";
import { createApiClient, formatAxiosError } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { AxiosResponse } from "axios";
import { ValidateSupporterKeyResponse } from "@server/routers/supporterKey";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle
} from "./ui/card";
import { Check, ExternalLink } from "lucide-react";

const formSchema = z.object({
    githubUsername: z
        .string()
        .nonempty({ message: "GitHub username is required" }),
    key: z.string().nonempty({ message: "Supporter key is required" })
});

export default function SupporterStatus() {
    const { supporterStatus, updateSupporterStatus } =
        useSupporterStatusContext();
    const [supportOpen, setSupportOpen] = useState(false);
    const [keyOpen, setKeyOpen] = useState(false);
    const [purchaseOptionsOpen, setPurchaseOptionsOpen] = useState(false);

    const api = createApiClient(useEnvContext());

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            githubUsername: "",
            key: ""
        }
    });

    async function hide() {
        await api.post("/supporter-key/hide");

        updateSupporterStatus({
            visible: false
        });
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const res = await api.post<
                AxiosResponse<ValidateSupporterKeyResponse>
            >("/supporter-key/validate", {
                githubUsername: values.githubUsername,
                key: values.key
            });

            const data = res.data.data;

            if (!data || !data.valid) {
                toast({
                    variant: "destructive",
                    title: "Invalid Key",
                    description: "Your supporter key is invalid."
                });
                return;
            }

            toast({
                variant: "default",
                title: "Valid Key",
                description:
                    "Your supporter key has been validated. Thank you for your support!"
            });

            setPurchaseOptionsOpen(false);
            setKeyOpen(false);

            updateSupporterStatus({
                visible: false
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: formatAxiosError(
                    error,
                    "Failed to validate supporter key."
                )
            });
            return;
        }
    }

    return (
        <>
            <Credenza
                open={purchaseOptionsOpen}
                onOpenChange={(val) => {
                    setPurchaseOptionsOpen(val);
                }}
            >
                <CredenzaContent className="max-w-3xl">
                    <CredenzaHeader>
                        <CredenzaTitle>
                            Support Development and Adopt a Pangolin!
                        </CredenzaTitle>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <p>
                            Purchase a supporter key to help us continue
                            developing Pangolin. Your contribution allows us
                            commit more time to maintain and add new features to
                            the application for everyone. We will never use this
                            to paywall features.
                        </p>

                        <p>
                            You will also get to adopt and meet your very own
                            pet Pangolin!
                        </p>

                        <p>
                            Payments are processed via GitHub. Afterward, you
                            can retrieve your key on{" "}
                            <Link
                                href="https://supporters.dev.fossorial.io/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                            >
                                our website
                            </Link>{" "}
                            and redeem it here.{" "}
                            <Link
                                href="https://supporters.dev.fossorial.io/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                            >
                                Learn more.
                            </Link>
                        </p>

                        <p>Please select the option that best suits you.</p>

                        <div className="grid md:grid-cols-2 grid-cols-1 gap-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Full Supporter</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-4xl mb-6">$95</p>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-2">
                                            <Check className="h-6 w-6 text-green-500" />
                                            <span className="text-muted-foreground">
                                                For the whole server
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="h-6 w-6 text-green-500" />
                                            <span className="text-muted-foreground">
                                                Lifetime purchase
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="h-6 w-6 text-green-500" />
                                            <span className="text-muted-foreground">
                                                Supporter status
                                            </span>
                                        </li>
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Link
                                        href="https://www.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full"
                                    >
                                        <Button className="w-full">Buy</Button>
                                    </Link>
                                </CardFooter>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Limited Supporter</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-4xl mb-6">$25</p>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-2">
                                            <Check className="h-6 w-6 text-green-500" />
                                            <span className="text-muted-foreground">
                                                For 5 or less users
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="h-6 w-6 text-green-500" />
                                            <span className="text-muted-foreground">
                                                Lifetime purchase
                                            </span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check className="h-6 w-6 text-green-500" />
                                            <span className="text-muted-foreground">
                                                Supporter status
                                            </span>
                                        </li>
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Link
                                        href="https://www.google.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full"
                                    >
                                        <Button className="w-full">Buy</Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        </div>

                        <div className="w-full pt-6 space-y-2">
                            <Button
                                className="w-full"
                                variant="outlinePrimary"
                                onClick={() => {
                                    setKeyOpen(true);
                                }}
                            >
                                Redeem Supporter Key
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => hide()}
                            >
                                Hide for 7 days
                            </Button>
                        </div>
                    </CredenzaBody>
                    <CredenzaFooter>
                        <CredenzaClose asChild>
                            <Button variant="outline">Close</Button>
                        </CredenzaClose>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>

            <Credenza
                open={keyOpen}
                onOpenChange={(val) => {
                    setKeyOpen(val);
                }}
            >
                <CredenzaContent>
                    <CredenzaHeader>
                        <CredenzaTitle>Enter Supporter Key</CredenzaTitle>
                        <CredenzaDescription>
                            Meet your very own pet Pangolin!
                        </CredenzaDescription>
                    </CredenzaHeader>
                    <CredenzaBody>
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                                id="form"
                            >
                                <FormField
                                    control={form.control}
                                    name="githubUsername"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                GitHub Username
                                            </FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="key"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Supporter Key</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </form>
                        </Form>
                    </CredenzaBody>
                    <CredenzaFooter>
                        <CredenzaClose asChild>
                            <Button variant="outline">Close</Button>
                        </CredenzaClose>
                        <Button type="submit" form="form">
                            Submit
                        </Button>
                    </CredenzaFooter>
                </CredenzaContent>
            </Credenza>

            {supporterStatus?.visible ? (
                <Button
                    variant="outlinePrimary"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                        setPurchaseOptionsOpen(true);
                    }}
                >
                    Buy Supporter Key
                </Button>
            ) : null}
        </>
    );
}
