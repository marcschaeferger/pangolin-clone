"use client";

import { createApiClient } from "@app/api";
import { Button } from "@app/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle
} from "@app/components/ui/card";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { AuthWithAccessTokenResponse } from "@server/routers/resource";
import { AxiosResponse } from "axios";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type AccessTokenProps = {
    accessTokenId: string | undefined;
    accessToken: string | undefined;
    resourceId: number;
    redirectUrl: string;
};

export default function AccessToken({
    accessTokenId,
    accessToken,
    resourceId,
    redirectUrl
}: AccessTokenProps) {
    const [loading, setLoading] = useState(true);

    const api = createApiClient(useEnvContext());

    useEffect(() => {
        if (!accessTokenId || !accessToken) {
            setLoading(false);
            return;
        }

        async function check() {
            try {
                const res = await api.post<
                    AxiosResponse<AuthWithAccessTokenResponse>
                >(`/auth/resource/${resourceId}/access-token`, {
                    accessToken,
                    accessTokenId
                });

                if (res.data.data.session) {
                    window.location.href = redirectUrl;
                }
            } catch (e) {
                console.error("Error checking access token", e);
            } finally {
                setLoading(false);
            }
        }

        check();
    }, [accessTokenId, accessToken]);

    return loading ? (
        <div></div>
    ) : (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-center text-2xl font-bold">
                    Access URL Invalid
                </CardTitle>
            </CardHeader>
            <CardContent>
                This shared access URL is invalid. Please contact the resource
                owner for a new URL.
                <div className="text-center mt-4">
                    <Button>
                        <Link href="/">Go Home</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
