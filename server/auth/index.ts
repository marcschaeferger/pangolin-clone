import { Lucia, TimeSpan } from "lucia";
import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import db from "@server/db";
import { sessions, users } from "@server/db/schema";
import environment from "@server/environment";

const adapter = new DrizzleSQLiteAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
    getUserAttributes: (attributes) => {
        return {
            username: attributes.username,
        };
    },
    // getSessionAttributes: (attributes) => {
    //     return {
    //         country: attributes.country,
    //     };
    // },
    sessionCookie: {
        name: "session",
        expires: false, // session cookies have very long lifespan (2 years)
        attributes: {
            secure: environment.ENVIRONMENT === "prod",
            sameSite: "strict",
            // domain: "example.com"
        },
    },
    sessionExpiresIn: new TimeSpan(2, "w"),
});

export default lucia;

// IMPORTANT!
declare module "lucia" {
    interface Register {
        Lucia: typeof lucia;
        DatabaseUserAttributes: DatabaseUserAttributes;
        DatabaseSessionAttributes: DatabaseSessionAttributes;
    }
}

interface DatabaseUserAttributes {
    username: string;
    passwordHash: string;
}

interface DatabaseSessionAttributes {
    // country: string;
}
