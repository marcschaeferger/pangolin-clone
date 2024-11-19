"use client";

import ResourceContext from "@app/contexts/resourceContext";
import { GetResourceAuthInfoResponse } from "@server/routers/resource";
import { GetResourceResponse } from "@server/routers/resource/getResource";
import { useState } from "react";

interface ResourceProviderProps {
    children: React.ReactNode;
    resource: GetResourceResponse;
    authInfo: GetResourceAuthInfoResponse;
}

export function ResourceProvider({
    children,
    resource: serverResource,
    authInfo: serverAuthInfo,
}: ResourceProviderProps) {
    const [resource, setResource] =
        useState<GetResourceResponse>(serverResource);

    const [authInfo, setAuthInfo] =
        useState<GetResourceAuthInfoResponse>(serverAuthInfo);

    const updateResource = (updatedResource: Partial<GetResourceResponse>) => {
        if (!resource) {
            throw new Error("No resource to update");
        }

        setResource((prev) => {
            if (!prev) {
                return prev;
            }

            return {
                ...prev,
                ...updatedResource,
            };
        });
    };

    const updateAuthInfo = (
        updatedAuthInfo: Partial<GetResourceAuthInfoResponse>
    ) => {
        if (!authInfo) {
            throw new Error("No auth info to update");
        }

        setAuthInfo((prev) => {
            if (!prev) {
                return prev;
            }

            return {
                ...prev,
                ...updatedAuthInfo,
            };
        });
    };

    return (
        <ResourceContext.Provider
            value={{ resource, updateResource, authInfo, updateAuthInfo }}
        >
            {children}
        </ResourceContext.Provider>
    );
}

export default ResourceProvider;
