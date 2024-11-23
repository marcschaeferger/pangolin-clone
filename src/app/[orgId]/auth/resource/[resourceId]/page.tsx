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

export default async function ResourceAuthPage(props: {
    params: Promise<{ resourceId: number; orgId: string }>;
    searchParams: Promise<{ r: string }>;
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
    } catch (e) {
        console.error(e);
        console.log("resource not found");
    }

    const getUser = cache(verifySession);
    const user = await getUser();

    if (!authInfo) {
        return <>Resource not found</>;
    }

    const isSSOOnly = authInfo.sso && !authInfo.password && !authInfo.pincode;

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
            redirect(searchParams.r || authInfo.url);
        }
    }

    if (userIsUnauthorized && isSSOOnly) {
        return <>You do not have access to this resource</>;
    }

    return (
        <>
            <div className="w-full max-w-md mx-auto p-3 md:mt-32">
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
                    redirect={searchParams.r || authInfo.url}
                />
            </div>
        </>
    );
}
