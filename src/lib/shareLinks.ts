export function constructShareLink(
    resourceId: number,
    id: string,
    token: string
) {
    return `${window.location.origin}/auth/resource/${resourceId}?token=${id}.${token}`;
}
