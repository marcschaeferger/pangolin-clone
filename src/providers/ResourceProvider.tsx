"use client";

import api from "@app/api";
import ResourceContext from "@app/contexts/resourceContext";
import { toast } from "@app/hooks/use-toast";
import { GetResourceResponse } from "@server/routers/resource/getResource";
import { AxiosResponse } from "axios";
import { useState } from "react";

interface ResourceProviderProps {
    children: React.ReactNode;
    resource: GetResourceResponse | null;
}

export function ResourceProvider({ children, resource: serverResource }: ResourceProviderProps) {
    const [resource, setResource] = useState<GetResourceResponse | null>(serverResource);

    const updateResource = async (updatedResource: Partial<GetResourceResponse>) => {
        try {
            if (!resource) {
                throw new Error("No resource to update");
            }

            const res = await api.post<AxiosResponse<GetResourceResponse>>(
                `resource/${resource.resourceId}`,
                updatedResource,
            );
            setResource(res.data.data);
            toast({
                title: "Resource updated!",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error updating resource...",
            })
        }
    };


    return <ResourceContext.Provider value={{ resource, updateResource }}>{children}</ResourceContext.Provider>;
}

export default ResourceProvider;