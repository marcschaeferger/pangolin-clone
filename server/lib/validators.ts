import z from "zod";

export function isValidCIDR(cidr: string): boolean {
    return z.string().cidr().safeParse(cidr).success;
}

export function isValidIP(ip: string): boolean {
    return z.string().ip().safeParse(ip).success;
}

export function isValidUrlGlobPattern(pattern: string): boolean {
    // Remove leading slash if present
    pattern = pattern.startsWith("/") ? pattern.slice(1) : pattern;

    // Empty string is not valid
    if (!pattern) {
        return false;
    }

    // Split path into segments
    const segments = pattern.split("/");

    // Check each segment
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        // Empty segments are not allowed (double slashes)
        if (!segment && i !== segments.length - 1) {
            return false;
        }

        // If segment contains *, it must be exactly *
        if (segment.includes("*") && segment !== "*") {
            return false;
        }

        // Check for invalid characters
        if (!/^[a-zA-Z0-9_*-]*$/.test(segment)) {
            return false;
        }
    }

    return true;
}
