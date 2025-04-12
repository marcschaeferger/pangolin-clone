import config from "@server/lib/config";

export function generateOidcRedirectUrl(orgId: string, idpId: number) {
    const dashboardUrl = config.getRawConfig().app.dashboard_url;
    const redirectPath = `/auth/org/${orgId}/idp/${idpId}/oidc/callback`;
    const redirectUrl = new URL(redirectPath, dashboardUrl).toString();
    return redirectUrl;
}
