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
import { Input } from "@app/components/ui/input";
import { Checkbox } from "@app/components/ui/checkbox";
import { Label } from "@app/components/ui/label";
import { toast } from "@app/hooks/useToast";
import { formatAxiosError } from "@app/lib/api";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { useTranslations } from "next-intl";
import { Key, Mail, Copy, Link } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@app/components/ui/alert";

type AdminPasswordResetProps = {
    userId: string;
    userEmail: string;
    userName: string;
    userType: string;
};

export default function AdminPasswordReset({
    userId,
    userEmail,
    userName,
    userType,
}: AdminPasswordResetProps) {
    const api = createApiClient(useEnvContext());
    const { env } = useEnvContext();
    const t = useTranslations();

    const [open, setOpen] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [sendEmail, setSendEmail] = useState(env.email.emailEnabled);
    const [resetLink, setResetLink] = useState<string | undefined>();

    const isExternalUser = userType !== "internal";

    // Don't render the button for external users
    if (isExternalUser) {
        return null;
    }

    const handleResetPassword = async () => {
        setPasswordLoading(true);

        try {
            const response = await api.post(`/admin/user/${userId}/password`, {
                sendEmail,
                expirationHours: 24
            });

            const data = response.data.data;

            if (data.resetLink) {
                setResetLink(data.resetLink);
            }

            toast({
                title: t('passwordResetSuccess'),
                description: data.emailSent 
                    ? `Password reset email sent to ${userEmail}`
                    : data.message,
            });

            if (env.email.emailEnabled && sendEmail && data.emailSent) {
                setOpen(false);
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: t('passwordResetError'),
                description: formatAxiosError(error, t('passwordResetErrorDescription')),
            });
        } finally {
            setPasswordLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast({
                title: t('linkCopied'),
                description: t('linkCopiedDescription'),
            });
        } catch (e) {
            toast({
                variant: "destructive",
                title: "Copy failed",
                description: "Failed to copy to clipboard. Please copy manually.",
            });
        }
    };

    const handleClose = () => {
        setOpen(false);
        setResetLink(undefined);
        setSendEmail(true);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <Key className="h-4 w-4 mr-2" />
                        {t('passwordReset')}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            {t('passwordReset')}
                        </DialogTitle>
                        <DialogDescription>
                            Reset password for <strong>{userName || userEmail}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 mt-4">
                        {!env.email.emailEnabled && (
                            <Alert variant="neutral">
                                <AlertTitle className="font-semibold">
                                    {t('otpEmailSmtpRequired')}
                                </AlertTitle>
                                <AlertDescription>
                                    Email is not configured. A reset link will be generated for you to share manually.
                                </AlertDescription>
                            </Alert>
                        )}
                        
                        {env.email.emailEnabled && (
                            <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Email Notification</h4>
                                </div>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Send a password reset email to the user with a secure reset link.
                                </p>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="sendEmail"
                                        checked={sendEmail}
                                        onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                                    />
                                    <Label htmlFor="sendEmail" className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                        {t('sendEmailNotification')}
                                    </Label>
                                </div>
                            </div>
                        )}

                        {resetLink && (!sendEmail || !env.email.emailEnabled) && (
                            <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
                                <Link className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <AlertTitle className="text-green-800 dark:text-green-200">Reset Link Generated</AlertTitle>
                                <AlertDescription className="text-green-700 dark:text-green-300">
                                    <div className="mt-2 space-y-2">
                                        <p className="text-sm">Share this link with the user:</p>
                                        <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 border rounded border-green-200 dark:border-green-700">
                                            <Input
                                                value={resetLink}
                                                readOnly
                                                className="text-xs"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => copyToClipboard(resetLink)}
                                                className="shrink-0"
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-green-600 dark:text-green-400">
                                            This link expires in 24 hours.
                                        </p>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose}>
                            {resetLink ? 'Close' : t('cancel')}
                        </Button>
                        {!resetLink && (
                            <Button 
                                onClick={handleResetPassword} 
                                disabled={passwordLoading}
                                className="flex items-center gap-2"
                            >
                                {passwordLoading ? (
                                    <>
                                        <Key className="h-4 w-4 animate-spin" />
                                        {t('passwordResetSending')}
                                    </>
                                ) : (
                                    <>
                                        {env.email.emailEnabled && sendEmail ? (
                                            <Mail className="h-4 w-4" />
                                        ) : (
                                            <Link className="h-4 w-4" />
                                        )}
                                        {env.email.emailEnabled && sendEmail 
                                            ? t('passwordResetSendEmail')
                                            : "Generate Reset Link"
                                        }
                                    </>
                                )}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
} 