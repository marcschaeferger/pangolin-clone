import { Request } from "express";
import { lucia } from "@server/auth";

export async function verifySession(req: Request) {
    const res = await lucia.validateSession(
        req.cookies[lucia.sessionCookieName],
    );
    return res;
}
