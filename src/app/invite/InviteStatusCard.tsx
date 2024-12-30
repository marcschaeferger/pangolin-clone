"use client";

import { createApiClient } from "@app/api";
import { Button } from "@app/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@app/components/ui/card";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

type InviteStatusCardProps = {
    type: "rejected" | "wrong_user" | "user_does_not_exist";
    token: string;
};

export default function InviteStatusCard({
    type,
    token,
}: InviteStatusCardProps) {
    const router = useRouter();

    const api = createApiClient(useEnvContext());

    async function goToLogin() {
        await api.post("/auth/logout", {});
        router.push(`/auth/login?redirect=/invite?token=${token}`);
    }

    async function goToSignup() {
        await api.post("/auth/logout", {});
        router.push(`/auth/signup?redirect=/invite?token=${token}`);
    }

    function renderBody() {
        if (type === "rejected") {
            return (
                <div>
                    <p className="text-center mb-4">
                        We're sorry, but it looks like the invite you're trying
                        to access has not been accepted or is no longer valid.
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-2">
                        <li>The invite may have expired</li>
                        <li>The invite might have been revoked</li>
                        <li>There could be a typo in the invite link</li>
                    </ul>
                </div>
            );
        } else if (type === "wrong_user") {
            return (
                <div>
                    <p className="text-center mb-4">
                        We're sorry, but it looks like the invite you're trying
                        to access is not for this user.
                    </p>
                    <p className="text-center">
                        Please make sure you're logged in as the correct user.
                    </p>
                </div>
            );
        } else if (type === "user_does_not_exist") {
            return (
                <div>
                    <p className="text-center mb-4">
                        We're sorry, but it looks like the invite you're trying
                        to access is not for a user that exists.
                    </p>
                    <p className="text-center">
                        Please create an account first.
                    </p>
                </div>
            );
        }
    }

    function renderFooter() {
        if (type === "rejected") {
            return (
                <Button
                    onClick={() => {
                        router.push("/");
                    }}
                >
                    Go home
                </Button>
            );
        } else if (type === "wrong_user") {
            return (
                <Button onClick={goToLogin}>Login in as different user</Button>
            );
        } else if (type === "user_does_not_exist") {
            return <Button onClick={goToSignup}>Create an account</Button>;
        }
    }

    return (
        <div className="p-3 md:mt-32 flex items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    {/* <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mx-auto mb-4">
                        <XCircle
                            className="w-10 h-10 text-red-600"
                            aria-hidden="true"
                        />
                    </div> */}
                    <CardTitle className="text-center text-2xl font-bold">
                        Invite Not Accepted
                    </CardTitle>
                </CardHeader>
                <CardContent>{renderBody()}</CardContent>

                <CardFooter className="flex justify-center space-x-4">
                    {renderFooter()}
                </CardFooter>
            </Card>
        </div>
    );
}
