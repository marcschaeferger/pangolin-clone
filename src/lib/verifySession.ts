import { internal } from "@app/api";
import { GetUserResponse } from "@server/routers/user";
import { AxiosResponse } from "axios";
import { cookies } from "next/headers";

export async function verifySession(): Promise<GetUserResponse | null> {
    const sessionId = cookies().get("session")?.value ?? null;

    try {
        const res = await internal.get<AxiosResponse<GetUserResponse>>(
            "/user",
            {
                headers: {
                    Cookie: `session=${sessionId}`,
                },
            },
        );

        return res.data.data;
    } catch {
        return null;
    }
}
