import { Button } from "@app/components/ui/button";
import {
    Credenza,
    CredenzaBody,
    CredenzaClose,
    CredenzaContent,
    CredenzaDescription,
    CredenzaFooter,
    CredenzaHeader,
    CredenzaTitle
} from "@app/components/Credenza";
import { useState, useEffect } from "react";
import { createApiClient } from "@app/lib/api";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { useOrgContext } from "@app/hooks/useOrgContext";
import { toast } from "@app/hooks/useToast";
import CopyTextBox from "@app/components/CopyTextBox";
import { Checkbox } from "@app/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@app/components/ui/select";
import { Label } from "@app/components/ui/label";

type RegenerateInvitationFormProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    invitation: {
        id: string;
        email: string;
        roleId: number;
        role: string;
    } | null;
    onRegenerate: (updatedInvitation: {
        id: string;
        email: string;
        expiresAt: string;
        role: string;
        roleId: number;
    }) => void;
};

export default function RegenerateInvitationForm({
    open,
    setOpen,
    invitation,
    onRegenerate
}: RegenerateInvitationFormProps) {
    const [loading, setLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);
    const [sendEmail, setSendEmail] = useState(true);
    const [validHours, setValidHours] = useState(72);
    const api = createApiClient(useEnvContext());
    const { org } = useOrgContext();

    const validForOptions = [
        { hours: 24, name: "1 day" },
        { hours: 48, name: "2 days" },
        { hours: 72, name: "3 days" },
        { hours: 96, name: "4 days" },
        { hours: 120, name: "5 days" },
        { hours: 144, name: "6 days" },
        { hours: 168, name: "7 days" }
    ];

    useEffect(() => {
        if (open) {
            setSendEmail(true);
            setValidHours(72);
        }
    }, [open]);

    async function handleRegenerate() {
        if (!invitation) return;

        if (!org?.org.orgId) {
            toast({
                variant: "destructive",
                title: "Organization ID Missing",
                description:
                    "Unable to regenerate invitation without an organization ID.",
                duration: 5000
            });
            return;
        }

        setLoading(true);

        try {
            const res = await api.post(`/org/${org.org.orgId}/create-invite`, {
                email: invitation.email,
                roleId: invitation.roleId,
                validHours,
                sendEmail,
                regenerate: true
            });

            if (res.status === 200) {
                const link = res.data.data.inviteLink;
                setInviteLink(link);

                if (sendEmail) {
                    toast({
                        variant: "default",
                        title: "Invitation Regenerated",
                        description: `A new invitation has been sent to ${invitation.email}.`,
                        duration: 5000
                    });
                } else {
                    toast({
                        variant: "default",
                        title: "Invitation Regenerated",
                        description: `A new invitation has been generated for ${invitation.email}.`,
                        duration: 5000
                    });
                }

                onRegenerate({
                    id: invitation.id,
                    email: invitation.email,
                    expiresAt: res.data.data.expiresAt,
                    role: invitation.role,
                    roleId: invitation.roleId
                });
            }
        } catch (error: any) {
            if (error.response?.status === 409) {
                toast({
                    variant: "destructive",
                    title: "Duplicate Invite",
                    description: "An invitation for this user already exists.",
                    duration: 5000
                });
            } else if (error.response?.status === 429) {
                toast({
                    variant: "destructive",
                    title: "Rate Limit Exceeded",
                    description:
                        "You have exceeded the limit of 3 regenerations per hour. Please try again later.",
                    duration: 5000
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Failed to Regenerate Invitation",
                    description:
                        "An error occurred while regenerating the invitation.",
                    duration: 5000
                });
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <Credenza
            open={open}
            onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (!isOpen) {
                    setInviteLink(null);
                }
            }}
        >
            <CredenzaContent>
                <CredenzaHeader>
                    <CredenzaTitle>Regenerate Invitation</CredenzaTitle>
                    <CredenzaDescription>
                        Revoke previous invitation and create a new one
                    </CredenzaDescription>
                </CredenzaHeader>
                <CredenzaBody>
                    {!inviteLink ? (
                        <div>
                            <p>
                                Are you sure you want to regenerate the
                                invitation for <b>{invitation?.email}</b>? This
                                will revoke the previous invitation.
                            </p>
                            <div className="flex items-center space-x-2 mt-4">
                                <Checkbox
                                    id="send-email"
                                    checked={sendEmail}
                                    onCheckedChange={(e) =>
                                        setSendEmail(e as boolean)
                                    }
                                />
                                <label htmlFor="send-email">
                                    Send email notification to the user
                                </label>
                            </div>
                            <div className="mt-4 space-y-2">
                                <Label>
                                    Validity Period
                                </Label>
                                <Select
                                    value={validHours.toString()}
                                    onValueChange={(value) =>
                                        setValidHours(parseInt(value))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select validity period" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {validForOptions.map((option) => (
                                            <SelectItem
                                                key={option.hours}
                                                value={option.hours.toString()}
                                            >
                                                {option.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-md">
                            <p>
                                The invitation has been regenerated. The user
                                must access the link below to accept the
                                invitation.
                            </p>
                            <CopyTextBox text={inviteLink} wrapText={false} />
                        </div>
                    )}
                </CredenzaBody>
                <CredenzaFooter>
                    {!inviteLink ? (
                        <>
                            <CredenzaClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </CredenzaClose>
                            <Button
                                onClick={handleRegenerate}
                                loading={loading}
                            >
                                Regenerate
                            </Button>
                        </>
                    ) : (
                        <CredenzaClose asChild>
                            <Button variant="outline">Close</Button>
                        </CredenzaClose>
                    )}
                </CredenzaFooter>
            </CredenzaContent>
        </Credenza>
    );
}
