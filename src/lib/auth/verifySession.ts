import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import { GetUserResponse } from "@server/routers/user";
import { AxiosResponse } from "axios";

export async function verifySession(): Promise<GetUserResponse | null> {
    try {
        const res = await internal.get<AxiosResponse<GetUserResponse>>(
            "/user",
            await authCookieHeader()
        );

        return res.data.data;
    } catch {
        return null;
    }
}