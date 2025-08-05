"use client";

import { Button } from "@/components/ui/button";
import {
    Credenza,
    CredenzaBody,
    CredenzaClose,
    CredenzaContent,
    CredenzaDescription,
    CredenzaFooter,
    CredenzaHeader,
    CredenzaTitle
} from "@/components/Credenza";

interface InvalidateSessionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    sessionType: "user" | "resource";
    sessionInfo?: {
        username?: string;
        email?: string | null;
        resourceName?: string;
    };
    isLoading?: boolean;
}

export function InvalidateSessionDialog({
    isOpen,
    onClose,
    onConfirm,
    sessionType,
    sessionInfo,
    isLoading = false
}: InvalidateSessionDialogProps) {
    return (
        <Credenza open={isOpen} onOpenChange={onClose}>
            <CredenzaContent>
                <CredenzaHeader>
                    <CredenzaTitle>
                        Invalidate {sessionType === "user" ? "User" : "Resource"} Session
                    </CredenzaTitle>
                    <CredenzaDescription>
                        {sessionType === "user" ? (
                            <>
                                Are you sure you want to invalidate the session for{" "}
                                <strong>{sessionInfo?.username || sessionInfo?.email}</strong>?
                            </>
                        ) : (
                            <>
                                Are you sure you want to invalidate the resource session for{" "}
                                <strong>{sessionInfo?.resourceName}</strong>?
                            </>
                        )}
                    </CredenzaDescription>
                </CredenzaHeader>
                <CredenzaBody>
                    {sessionType === "user" ? (
                        <p className="text-sm text-muted-foreground">
                            This will immediately log out the user and they will need to sign in again.
                            This action cannot be undone.
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            This will immediately terminate access to the resource and any active 
                            connections will be closed. This action cannot be undone.
                        </p>
                    )}
                </CredenzaBody>
                <CredenzaFooter>
                    <CredenzaClose asChild>
                        <Button variant="outline" disabled={isLoading}>Cancel</Button>
                    </CredenzaClose>
                    <Button 
                        onClick={onConfirm}
                        disabled={isLoading}
                        variant="destructive"
                        loading={isLoading}
                    >
                        {isLoading ? "Invalidating..." : "Invalidate Session"}
                    </Button>
                </CredenzaFooter>
            </CredenzaContent>
        </Credenza>
    );
}