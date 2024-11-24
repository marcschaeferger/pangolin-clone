import { cookies } from "next/headers";

export async function authCookieHeader() {
    const allCookies = await cookies();
    const cookieName = process.env.SESSION_COOKIE_NAME!;
    const sessionId = allCookies.get(cookieName)?.value ?? null;
    return {
        headers: {
            Cookie: `${cookieName}=${sessionId}`,
        },
    };
}
