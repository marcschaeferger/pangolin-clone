import { cookies } from "next/headers";

export async function authCookieHeader() {
    const allCookies = await cookies();
    const sessionId = allCookies.get("session")?.value ?? null;
    return {
        headers: {
            Cookie: `session=${sessionId}`
        }
    }
}
