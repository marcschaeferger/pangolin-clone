export function isValidCIDR(cidr: string): boolean {
    // Match CIDR pattern (e.g., "192.168.0.0/24")
    const cidrPattern =
        /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/;

    if (!cidrPattern.test(cidr)) {
        return false;
    }

    // Validate IP address part
    const ipPart = cidr.split("/")[0];
    const octets = ipPart.split(".");

    return octets.every((octet) => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
    });
}

export function isValidIP(ip: string): boolean {
    const ipPattern = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;

    if (!ipPattern.test(ip)) {
        return false;
    }

    const octets = ip.split(".");

    return octets.every((octet) => {
        const num = parseInt(octet, 10);
        return num >= 0 && num <= 255;
    });
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
