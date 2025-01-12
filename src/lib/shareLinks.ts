import { pullEnv } from "./pullEnv";

export function constructShareLink(
    resourceId: number,
    id: string,
    token: string
) {
    return `${window.location.origin}/auth/resource/${resourceId}?token=${id}.${token}`;
}

export function constructDirectShareLink(
    param: string,
    resourceUrl: string,
    id: string,
    token: string
) {
    return `${resourceUrl}?${param}=${id}.${token}`;
}
