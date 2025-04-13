"use client";

import { useEnvContext } from "@app/hooks/useEnvContext";
import { createApiClient, formatAxiosError } from "@app/lib/api";
import { ValidateOidcUrlCallbackResponse } from "@server/routers/idp";
import { AxiosResponse } from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ValidateOidcTokenParams = {
    orgId: string;
    idpId: string;
    code: string | undefined;
    expectedState: string | undefined;
    stateCookie: string | undefined;
};

export default function ValidateOidcToken(props: ValidateOidcTokenParams) {
    const { env } = useEnvContext();
    const api = createApiClient({ env });
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function validate() {
            setLoading(true);

            console.log("Validating OIDC token", {
                code: props.code,
                expectedState: props.expectedState,
                stateCookie: props.stateCookie
            });

            try {
                const res = await api.post<
                    AxiosResponse<ValidateOidcUrlCallbackResponse>
                >(`/auth/idp/${props.idpId}/oidc/validate-callback`, {
                    code: props.code,
                    state: props.expectedState,
                    storedState: props.stateCookie
                });

                console.log("Validate OIDC token response", res.data);

                const redirectUrl = res.data.data.redirectUrl;

                if (!redirectUrl) {
                    router.push("/");
                }

                if (redirectUrl.startsWith("http")) {
                    window.location.href = res.data.data.redirectUrl; // TODO: validate this to make sure it's safe
                } else {
                    router.push(res.data.data.redirectUrl);
                }

            } catch (e) {
                setError(formatAxiosError(e, "Error validating OIDC token"));
            } finally {
                setLoading(false);
            }
        }

        validate();
    }, []);

    return (
        <>
            <h1>Validating OIDC Token...</h1>
            {loading && <p>Loading...</p>}
            {!loading && <p>Token validated successfully!</p>}
            {error && <p>Error: {error}</p>}
        </>
    );
}
