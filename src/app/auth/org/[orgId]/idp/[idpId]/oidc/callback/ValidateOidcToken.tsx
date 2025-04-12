"use client";

import { useEnvContext } from "@app/hooks/useEnvContext";
import { createApiClient, formatAxiosError } from "@app/lib/api";
import { ValidateOidcUrlCallbackResponse } from "@server/routers/idp";
import { AxiosResponse } from "axios";
import { useEffect, useState } from "react";

type ValidateOidcTokenParams = {
    orgId: string;
    idpId: string;
    code: string | undefined;
    verifier: string | undefined;
    storedState: string | undefined;
    expectedState: string | undefined;
};

export default function ValidateOidcToken(props: ValidateOidcTokenParams) {
    const { env } = useEnvContext();
    const api = createApiClient({ env });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!props.code || !props.verifier) {
            setError("Missing code or verifier");
            setLoading(false);
            return;
        }

        if (!props.storedState) {
            setError("Missing stored state");
            setLoading(false);
            return;
        }

        if (props.storedState !== props.expectedState) {
            setError("Invalid state");
            setLoading(false);
            return;
        }

        async function validate() {
            setLoading(true);

            try {
                const res = await api.post<
                    AxiosResponse<ValidateOidcUrlCallbackResponse>
                >(
                    `/auth/org/${props.orgId}/idp/${props.idpId}/oidc/validate-callback`,
                    {
                        code: props.code,
                        codeVerifier: props.verifier
                    }
                );
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
