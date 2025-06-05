import { cookies } from "next/headers";
import ValidateOidcToken from "./ValidateOidcToken";
import { idp } from "@server/db";
import { db } from "@server/db";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

export default async function Page(props: {
    params: Promise<{ orgId: string; idpId: string }>;
    searchParams: Promise<{
        code: string;
        state: string;
    }>;
}) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const t = await getTranslations();

    const allCookies = await cookies();
    const stateCookie = allCookies.get("p_oidc_state")?.value;

    // query db directly in server component because just need the name
    const [idpRes] = await db
        .select({ name: idp.name })
        .from(idp)
        .where(eq(idp.idpId, parseInt(params.idpId!)));

    if (!idpRes) {
        return <div>{t('idpErrorNotFound')}</div>;
    }

    return (
        <>
            <ValidateOidcToken
                orgId={params.orgId}
                idpId={params.idpId}
                code={searchParams.code}
                expectedState={searchParams.state}
                stateCookie={stateCookie}
                idp={{ name: idpRes.name }}
            />
        </>
    );
}
