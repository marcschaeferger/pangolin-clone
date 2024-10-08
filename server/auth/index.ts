export * from "./unauthorizedResponse";
export * from "./verifySession";

import { Lucia, TimeSpan } from "lucia";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import db from "@server/db";
import { sessions, users } from "@server/db/schema";

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
    // getSessionAttributes: (attributes) => {
    //     return {
    //         country: attributes.country,
    //     };
    // },
    sessionCookie: {
        name: "session",
        expires: false,
        attributes: {
            // secure: environment.ENVIRONMENT === "prod",
            // sameSite: "strict",
            secure: false,
            domain: ".testing123.io",
        },
    },
    sessionExpiresIn: new TimeSpan(2, "w"),
});

export default lucia;

declare module "lucia" {
    interface Register {
        Lucia: typeof lucia;
        DatabaseUserAttributes: DatabaseUserAttributes;
        DatabaseSessionAttributes: DatabaseSessionAttributes;
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

interface DatabaseSessionAttributes {
    // country: string;
}
