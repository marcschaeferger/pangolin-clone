import { cookies } from "next/headers";
import lucia from "@server/auth";

export async function verifySession() {
    const sessionId = cookies().get(lucia.sessionCookieName)?.value ?? null;
    const session = await lucia.validateSession(sessionId || "");
    return session;
}
