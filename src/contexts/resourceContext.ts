import { GetResourceResponse } from "@server/routers/resource/getResource";
import { createContext } from "react";

interface ResourceContextType {
    resource: GetResourceResponse;
    updateResource: (updatedResource: Partial<GetResourceResponse>) => void;
}

const ResourceContext = createContext<ResourceContextType | undefined>(
    undefined
);

export default ResourceContext;
