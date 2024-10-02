import { Lucia, TimeSpan } from "lucia";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import db from "@server/db";
import { sessions, users } from "@server/db/schema";
import environment from "@server/environment";

const adapter = new DrizzleSQLiteAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
    getUserAttributes: (attributes) => {
        return {
            email: attributes.email,
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
            secure: environment.ENVIRONMENT === "prod",
            sameSite: "strict",
            // domain: "example.com"
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
}

interface DatabaseSessionAttributes {
    // country: string;
}
