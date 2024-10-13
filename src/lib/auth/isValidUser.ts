import { GetUserResponse } from "@server/routers/user";
import { verifySession } from "./verifySession";

export async function isValidUser(): Promise<GetUserResponse | null> {
    const user = await verifySession();

    if (!user) {
        return null;
    }

    if (!user.emailVerified) {
        return null;
    }

    return user;
}
