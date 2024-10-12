import { defineConfig } from "drizzle-kit";
import config, { APP_PATH } from "@server/config";
import path from "path";

export default defineConfig({
    dialect: "sqlite",
    schema: path.join("server", "db", "schema.ts"),
    out: path.join("server", "migrations"),
    verbose: true,
    dbCredentials: {
        url: path.join(APP_PATH, "db", "db.sqlite"),
    },
});
