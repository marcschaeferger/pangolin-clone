import { defineConfig } from "drizzle-kit";
import enviroment from "@server/environment"

export default defineConfig({
    dialect: "sqlite",
    schema: "server/db/schema.ts",
    out: "server/migrations",
    verbose: true,
    dbCredentials: {
        url: `${enviroment.CONFIG_PATH}/db/db.sqlite`
    },
});
