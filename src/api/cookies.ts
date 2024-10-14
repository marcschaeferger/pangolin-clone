import { cookies } from "next/headers";

export function authCookieHeader() {
    const sessionId = cookies().get("session")?.value ?? null;
    return {
        headers: {
            Cookie: `session=${sessionId}`
        }
    }
}
