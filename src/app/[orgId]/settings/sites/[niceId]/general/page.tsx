"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSiteContext } from "@app/hooks/useSiteContext";
import { useForm } from "react-hook-form";
import api from "@app/api";
import { useToast } from "@app/hooks/useToast";
import { useRouter } from "next/navigation";
import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { formatAxiosError } from "@app/lib/utils";

const GeneralFormSchema = z.object({
    name: z.string(),
});

type GeneralFormValues = z.infer<typeof GeneralFormSchema>;

export default function GeneralPage() {
    const { site, updateSite } = useSiteContext();
    const { toast } = useToast();

    const router = useRouter();

    const form = useForm<GeneralFormValues>({
        resolver: zodResolver(GeneralFormSchema),
        defaultValues: {
            name: site?.name,
        },
        mode: "onChange",
    });

    async function onSubmit(data: GeneralFormValues) {
        await api
            .post(`/site/${site?.siteId}`, {
                name: data.name,
            })
            .catch((e) => {
                toast({
                    variant: "destructive",
                    title: "Failed to update site",
                    description: formatAxiosError(
                        e,
                        "An error occurred while updating the site."
                    ),
                });
            });

        updateSite({ name: data.name });

        router.refresh();
    }

    return (
        <>
            <div className="space-y-8">
                <SettingsSectionTitle
                    title="General Settings"
                    description="Configure the general settings for this site"
                    size="1xl"
                />

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-8"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        This is the display name of the site
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Save Changes</Button>
                    </form>
                </Form>
            </div>
        </>
    );
}
