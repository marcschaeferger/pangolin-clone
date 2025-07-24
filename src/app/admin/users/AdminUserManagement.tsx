"use client";

import { useState } from "react";
import { Button } from "@app/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@app/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@app/components/ui/form";
import { Input } from "@app/components/ui/input";
import { toast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { useTranslations } from "next-intl";
import { Settings, User } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

type AdminUserManagementProps = {
    userId: string;
    userEmail: string;
    userName: string;
    userType: string;
    userUsername: string;
};

export default function AdminUserManagement({
    userId,
    userEmail,
    userName,
    userType,
    userUsername,
}: AdminUserManagementProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const api = createApiClient(useEnvContext());
    const t = useTranslations();

    const isExternalUser = userType !== "internal";

    // Don't render the button for external users
    if (isExternalUser) {
        return null;
    }

    // Form schema for user details
    const formSchema = z.object({
        // Name field removed - no longer needed
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            // No default values needed
        }
    });

    const handleUpdateUser = async (values: z.infer<typeof formSchema>) => {
        setLoading(true);

        try {
            // No update needed since name field is removed
            toast({
                title: t('userUpdated'),
                description: t('userUpdatedDescription'),
            });
        } catch (e) {
            toast({
                variant: "destructive",
                title: t('userErrorUpdate'),
                description: formatAxiosError(e, t('userErrorUpdateDescription')),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
        form.reset();
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        {t('manage')}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t('manageUser')}
                        </DialogTitle>
                        <DialogDescription>
                            Manage user details for <strong>{userName || userEmail}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 mt-4">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleUpdateUser)} className="space-y-4">
                                <p className="text-sm text-muted-foreground mb-4">
                                    User information display. Email addresses cannot be changed via the UI.
                                </p>
                                <div className="text-sm text-muted-foreground">
                                    <p><strong>Email:</strong> {userEmail}</p>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <p><strong>Username:</strong> {userUsername}</p>
                                    <p><strong>Type:</strong> {userType}</p>
                                </div>
                            </form>
                        </Form>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose}>
                            {t('cancel')}
                        </Button>
                        <Button 
                            type="submit"
                            disabled={loading}
                            onClick={form.handleSubmit(handleUpdateUser)}
                        >
                            {loading ? t('saving') : t('saveChanges')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
} 