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
        
        // Empty segments are not allowed (double slashes), except at the end
        if (!segment && i !== segments.length - 1) {
            return false;
        }

        // If segment contains *, it must be exactly *
        if (segment.includes("*") && segment !== "*") {
            return false;
        }

        // Check each character in the segment
        for (let j = 0; j < segment.length; j++) {
            const char = segment[j];
            
            // Check for percent-encoded sequences
            if (char === "%" && j + 2 < segment.length) {
                const hex1 = segment[j + 1];
                const hex2 = segment[j + 2];
                if (!/^[0-9A-Fa-f]$/.test(hex1) || !/^[0-9A-Fa-f]$/.test(hex2)) {
                    return false;
                }
                j += 2; // Skip the next two characters
                continue;
            }

            // Allow:
            // - unreserved (A-Z a-z 0-9 - . _ ~)
            // - sub-delims (! $ & ' ( ) * + , ; =)
            // - @ : for compatibility with some systems
            if (!/^[A-Za-z0-9\-._~!$&'()*+,;=@:]$/.test(char)) {
                return false;
            }
        }
    }
    
    return true;
}