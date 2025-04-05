export function constructShareLink(
    token: string
) {
    return `${window.location.origin}/s/${token!}`;
}

export function constructDirectShareLink(
    param: string,
    resourceUrl: string,
    token: string
) {
    return `${resourceUrl}?${param}=${token}`;
}
