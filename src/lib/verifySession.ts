import api from "@app/api";
import { cookies } from "next/headers";

export async function verifySession() {
    const sessionId = cookies().get("session")?.value ?? null;

    try {
        const res = await api.get("/user", {
            headers: {
                Cookie: `session=${sessionId}`
            }
        });
        return true;
    } catch {
        return false
    }
}
