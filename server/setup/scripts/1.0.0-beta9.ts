import db from "@server/db";
import {
    emailVerificationCodes,
    passwordResetTokens,
    resourceOtp,
    resourceWhitelist,
    userInvites,
    users
} from "@server/db/schema";
import { APP_PATH, configFilePath1, configFilePath2 } from "@server/lib/consts";
import { sql } from "drizzle-orm";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export default async function migration() {
    console.log("Running setup script 1.0.0-beta.9...");

    try {
        await db.transaction(async (trx) => {
            trx.run(sql`UPDATE ${users} SET email = LOWER(email);`);
            trx.run(
                sql`UPDATE ${emailVerificationCodes} SET email = LOWER(email);`
            );
            trx.run(
                sql`UPDATE ${passwordResetTokens} SET email = LOWER(email);`
            );
            trx.run(sql`UPDATE ${userInvites} SET email = LOWER(email);`);
            trx.run(sql`UPDATE ${resourceWhitelist} SET email = LOWER(email);`);
            trx.run(sql`UPDATE ${resourceOtp} SET email = LOWER(email);`);
        });
    } catch (error) {
        console.log(
            "We were unable to make all emails lower case in the database."
        );
        console.error(error);
    }

    try {
        // Determine which config file exists
        const filePaths = [configFilePath1, configFilePath2];
        let filePath = "";
        for (const path of filePaths) {
            if (fs.existsSync(path)) {
                filePath = path;
                break;
            }
        }

        if (!filePath) {
            throw new Error(
                `No config file found (expected config.yml or config.yaml).`
            );
        }

        // Read and parse the YAML file
        let rawConfig: any;
        const fileContents = fs.readFileSync(filePath, "utf8");
        rawConfig = yaml.load(fileContents);

        rawConfig.server.resource_session_request_param = "p_session_request";
        rawConfig.server.session_cookie_name = "p_session_token"; // rename to prevent conflicts
        delete rawConfig.server.resource_session_cookie_name;

        // Write the updated YAML back to the file
        const updatedYaml = yaml.dump(rawConfig);
        fs.writeFileSync(filePath, updatedYaml, "utf8");
    } catch (e) {
        console.log(
            `Failed to add resource_session_request_param to config. Please add it manually. https://docs.fossorial.io/Pangolin/Configuration/config`
        );
        throw e;
    }

    try {
        const traefikPath = path.join(
            APP_PATH,
            "traefik",
            "traefik_config.yml"
        );

        const schema = z.object({
            experimental: z.object({
                plugins: z.object({
                    badger: z.object({
                        moduleName: z.string(),
                        version: z.string()
                    })
                })
            })
        });

        const traefikFileContents = fs.readFileSync(traefikPath, "utf8");
        const traefikConfig = yaml.load(traefikFileContents) as any;

        const parsedConfig = schema.safeParse(traefikConfig);

        if (!parsedConfig.success) {
            throw new Error(fromZodError(parsedConfig.error).toString());
        }

        traefikConfig.experimental.plugins.badger.version = "v1.0.0-beta.3";

        const updatedTraefikYaml = yaml.dump(traefikConfig);

        fs.writeFileSync(traefikPath, updatedTraefikYaml, "utf8");

        console.log(
            "Updated the version of Badger in your Traefik configuration to v1.0.0-beta.3."
        );
    } catch (e) {
        console.log(
            "We were unable to update the version of Badger in your Traefik configuration. Please update it manually."
        );
        console.error(e);
    }

    try {
        await db.transaction(async (trx) => {
            trx.run(sql`ALTER TABLE 'resourceSessions' ADD 'isRequestToken' integer;`);
            trx.run(sql`ALTER TABLE 'resourceSessions' ADD 'userSessionId' text REFERENCES session(id);`);
        });
    } catch (e) {
        console.log(
            "We were unable to add columns to the resourceSessions table."
        );
        throw e;
    }

    console.log("Done.");
}
