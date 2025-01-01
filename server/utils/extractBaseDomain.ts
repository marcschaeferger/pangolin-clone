export function extractBaseDomain(url: string): string {
    const newUrl = new URL(url);
    const hostname = newUrl.hostname;
    const parts = hostname.split(".");

    if (parts.length <= 2) {
        return parts.join(".");
    }

    return parts.slice(1).join(".");
}
