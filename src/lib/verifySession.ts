import { internal } from "@app/api";
import { cookies } from "next/headers";

export async function verifySession() {
    const sessionId = cookies().get("session")?.value ?? null;

    try {
        await internal.get("/user", {
            headers: {
                Cookie: `session=${sessionId}`
            }
        });
        return true;
    } catch {
        return false
    }
}
