import { defineConfig } from "drizzle-kit";
import environment from "@server/environment"

export default defineConfig({
    dialect: "sqlite",
    schema: "server/db/schema.ts",
    out: "server/migrations",
    verbose: true,
    dbCredentials: {
        url: `${environment.CONFIG_PATH}/db/db.sqlite`
    },
});
