import { defineConfig } from "drizzle-kit";
import environment from "@server/environment";
import path from "path";

export default defineConfig({
    dialect: "sqlite",
    schema: path.join("server", "db", "schema.ts"),
    out: path.join("server", "migrations"),
    verbose: true,
    dbCredentials: {
        url: path.join(environment.CONFIG_PATH, "db", "db.sqlite"),
    },
});
