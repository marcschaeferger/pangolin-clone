import { internal } from "@app/lib/api";
import { authCookieHeader } from "@app/lib/api/cookies";
import { GetUserResponse } from "@server/routers/user";
import { AxiosResponse } from "axios";

export async function verifySession({
    skipCheckVerifyEmail,
}: {
    skipCheckVerifyEmail?: boolean;
} = {}): Promise<GetUserResponse | null> {
    try {
        const res = await internal.get<AxiosResponse<GetUserResponse>>(
            "/user",
            await authCookieHeader(),
        );

        const user = res.data.data;

        if (!user) {
            return null;
        }

        if (
            !skipCheckVerifyEmail &&
            !user.emailVerified &&
            process.env.FLAGS_EMAIL_VERIFICATION_REQUIRED == "true"
        ) {
            return null;
        }

        return user;
    } catch (e) {
        return null;
    }
}
