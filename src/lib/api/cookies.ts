import { cookies } from "next/headers";
import { pullEnv } from "../pullEnv";

export async function authCookieHeader() {
    const env = pullEnv();

    const allCookies = await cookies();
    const cookieName = env.server.sessionCookieName;
    const sessionId = allCookies.get(cookieName)?.value ?? null;
    return {
        headers: {
            Cookie: `${cookieName}=${sessionId}`,
        },
    };
}
