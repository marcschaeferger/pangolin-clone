import { cookies } from "next/headers";
import ValidateOidcToken from "./ValidateOidcToken";

export default async function Page(props: {
    params: Promise<{ orgId: string; idpId: string }>;
    searchParams: Promise<{
        code: string;
        state: string;
    }>;
}) {
    const params = await props.params;
    const searchParams = await props.searchParams;

    const allCookies = await cookies();
    const stateCookie = allCookies.get("p_oidc_state")?.value;

    return (
        <>
            <ValidateOidcToken
                orgId={params.orgId}
                idpId={params.idpId}
                code={searchParams.code}
                expectedState={searchParams.state}
                stateCookie={stateCookie}
            />
        </>
    );
}
