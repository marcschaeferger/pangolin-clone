import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent(
    "securitySchemes",
    "Bearer Auth",
    {
        type: "http",
        scheme: "bearer"
    }
);

export enum OpenAPITags {
    Site = "Site",
    Org = "Organization"
}
