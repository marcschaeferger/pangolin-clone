"use client";

import ResourceContext from "@app/contexts/resourceContext";
import { GetResourceResponse } from "@server/routers/resource/getResource";
import { useState } from "react";

interface ResourceProviderProps {
    children: React.ReactNode;
    resource: GetResourceResponse;
}

export function ResourceProvider({
    children,
    resource: serverResource,
}: ResourceProviderProps) {
    const [resource, setResource] =
        useState<GetResourceResponse>(serverResource);

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

    return (
        <ResourceContext.Provider value={{ resource, updateResource }}>
            {children}
        </ResourceContext.Provider>
    );
}

export default ResourceProvider;
