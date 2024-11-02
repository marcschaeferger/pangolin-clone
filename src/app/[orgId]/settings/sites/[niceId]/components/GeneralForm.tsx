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

const GeneralFormSchema = z.object({
    name: z.string(),
});

type GeneralFormValues = z.infer<typeof GeneralFormSchema>;

export function GeneralForm() {
    const { site, updateSite } = useSiteContext();

    const form = useForm<GeneralFormValues>({
        resolver: zodResolver(GeneralFormSchema),
        defaultValues: {
            name: site?.name,
        },
        mode: "onChange",
    });

    async function onSubmit(data: GeneralFormValues) {
        await updateSite({ name: data.name });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                                This is the display name of the site.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit">Update Site</Button>
            </form>
        </Form>
    );
}
