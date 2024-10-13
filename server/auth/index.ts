export * from "./unauthorizedResponse";
export * from "./verifySession";

import { Lucia, TimeSpan } from "lucia";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import db from "@server/db";
import { sessions, users } from "@server/db/schema";
import config from "@server/config";

const adapter = new DrizzleSQLiteAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
    getUserAttributes: (attributes) => {
        return {
            email: attributes.email,
            twoFactorEnabled: attributes.twoFactorEnabled,
            twoFactorSecret: attributes.twoFactorSecret,
            emailVerified: attributes.emailVerified,
            dateCreated: attributes.dateCreated,
        };
    },
    sessionCookie: {
        name: "session",
        expires: false,
        attributes: {
            sameSite: "strict",
            secure: config.server.secure_cookies || false,
            domain:
                "." + new URL(config.app.base_url).hostname.split(".").slice(-2).join("."),
        },
    },
    sessionExpiresIn: new TimeSpan(2, "w"),
});

export default lucia;

declare module "lucia" {
    interface Register {
        Lucia: typeof lucia;
        DatabaseUserAttributes: DatabaseUserAttributes;
    }
}

interface DatabaseUserAttributes {
    email: string;
    passwordHash: string;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    emailVerified: boolean;
    dateCreated: string;
}
