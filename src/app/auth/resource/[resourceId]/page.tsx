import {
    GetResourceAuthInfoResponse,
    GetResourceResponse,
} from "@server/routers/resource";
import ResourceAuthPortal from "./components/ResourceAuthPortal";
import { internal } from "@app/api";
import { AxiosResponse } from "axios";
import { authCookieHeader } from "@app/api/cookies";
import { cache } from "react";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";
import ResourceNotFound from "./components/ResourceNotFound";
import ResourceAccessDenied from "./components/ResourceAccessDenied";

export default async function ResourceAuthPage(props: {
    params: Promise<{ resourceId: number }>;
    searchParams: Promise<{ redirect: string }>;
}) {
    const params = await props.params;
    const searchParams = await props.searchParams;

    let authInfo: GetResourceAuthInfoResponse | undefined;
    try {
        const res = await internal.get<
            AxiosResponse<GetResourceAuthInfoResponse>
        >(`/resource/${params.resourceId}/auth`, await authCookieHeader());

        if (res && res.status === 200) {
            authInfo = res.data.data;
        }
    } catch (e) {}

    const getUser = cache(verifySession);
    const user = await getUser();

    if (!authInfo) {
        return (
            <div className="w-full max-w-md">
                <ResourceNotFound />
            </div>
        );
    }

    const hasAuth = authInfo.password || authInfo.pincode || authInfo.sso;
    const isSSOOnly = authInfo.sso && !authInfo.password && !authInfo.pincode;

    const redirectUrl = searchParams.redirect || authInfo.url;

    if (!hasAuth) {
        // no authentication so always go straight to the resource
        redirect(redirectUrl);
    }

    let userIsUnauthorized = false;
    if (user && authInfo.sso) {
        let doRedirect = false;
        try {
            const res = await internal.get<AxiosResponse<GetResourceResponse>>(
                `/resource/${params.resourceId}`,
                await authCookieHeader(),
            );

            console.log(res.data);
            doRedirect = true;
        } catch (e) {
            console.error(e);
            userIsUnauthorized = true;
        }

        if (doRedirect) {
            redirect(redirectUrl);
        }
    }

    if (userIsUnauthorized && isSSOOnly) {
        return (
            <div className="w-full max-w-md">
                <ResourceAccessDenied />
            </div>
        );
    }

    const getNumMethods = () => {
        let colLength = 0;
        if (authInfo.pincode) colLength++;
        if (authInfo.password) colLength++;
        if (authInfo.sso) colLength++;
        return colLength;
    };

    return (
        <>
            <div className="w-full max-w-md">
                <ResourceAuthPortal
                    methods={{
                        password: authInfo.password,
                        pincode: authInfo.pincode,
                        sso: authInfo.sso && !userIsUnauthorized,
                    }}
                    resource={{
                        name: authInfo.resourceName,
                        id: authInfo.resourceId,
                    }}
                    redirect={redirectUrl}
                    queryParamName={
                        process.env.RESOURCE_SESSION_QUERY_PARAM_NAME!
                    }
                    numMethods={getNumMethods()}
                />
            </div>
        </>
    );
}
