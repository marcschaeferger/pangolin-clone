"use client";

import { createApiClient } from "@app/lib/api";
import { Button } from "@app/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@app/components/ui/card";
import { useEnvContext } from "@app/hooks/useEnvContext";
import { AuthWithAccessTokenResponse } from "@server/routers/resource";
import { AxiosResponse } from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";

type AccessTokenProps = {
    token: string;
    resourceId?: number;
};

export default function AccessToken({
    token,
    resourceId
}: AccessTokenProps) {
    const [loading, setLoading] = useState(true);
    const [isValid, setIsValid] = useState(false);

    const { env } = useEnvContext();
    const api = createApiClient({ env });

    function appendRequestToken(url: string, token: string) {
        const fullUrl = new URL(url);
        fullUrl.searchParams.append(
            env.server.resourceSessionRequestParam,
            token
        );
        return fullUrl.toString();
    }

    useEffect(() => {
        if (!token) {
            setLoading(false);
            return;
        }

        let accessTokenId = "";
        let accessToken = "";

        const parts = token.split(".");

        if (parts.length === 2) {
            accessTokenId = parts[0];
            accessToken = parts[1];
        } else if (parts.length === 1) {
            accessToken = parts[0];
        } else {
            setLoading(false);
            return;
        }

        async function checkSHA256() {
            try {
                const res = await api.post<
                    AxiosResponse<AuthWithAccessTokenResponse>
                >(`/auth/access-token`, {
                    accessToken,
                    accessTokenId
                });

                if (res.data.data.session) {
                    setIsValid(true);
                    window.location.href = appendRequestToken(
                        res.data.data.redirectUrl!,
                        res.data.data.session
                    );
                }
            } catch (e) {
                console.error("Error checking access token", e);
            } finally {
                setLoading(false);
            }
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
                    setIsValid(true);
                    window.location.href = appendRequestToken(
                        res.data.data.redirectUrl!,
                        res.data.data.session
                    );
                }
            } catch (e) {
                console.error("Error checking access token", e);
            } finally {
                setLoading(false);
            }
        }

        if (!accessTokenId) {
            // no access token id so check the sha256
            checkSHA256();
        } else {
            check();
        }
    }, [token]);

    function renderTitle() {
        if (isValid) {
            return "Access Granted";
        } else {
            return "Access URL Invalid";
        }
    }

    function renderContent() {
        if (isValid) {
            return (
                <div>
                    You have been granted access to this resource. Redirecting
                    you...
                </div>
            );
        } else {
            return (
                <div>
                    This shared access URL is invalid. Please contact the
                    resource owner for a new URL.
                    <div className="text-center mt-4">
                        <Button>
                            <Link href="/">Go Home</Link>
                        </Button>
                    </div>
                </div>
            );
        }
    }

    return loading ? (
        <div></div>
    ) : (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="text-center text-2xl font-bold">
                    {renderTitle()}
                </CardTitle>
            </CardHeader>
            <CardContent>{renderContent()}</CardContent>
        </Card>
    );
}
