import db from "@server/db";
import { configFilePath1, configFilePath2 } from "@server/lib/consts";
import { sql } from "drizzle-orm";
import fs from "fs";
import yaml from "js-yaml";

const version = "1.2.0";

export default async function migration() {
    console.log(`Running setup script ${version}...`);

    try {
        db.transaction((trx) => {
            trx.run(
                sql`ALTER TABLE 'resources' ADD 'enabled' integer DEFAULT true NOT NULL;`
            );
        });

        console.log(`Migrated database schema`);
    } catch (e) {
        console.log("Unable to migrate database schema");
        throw e;
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

        if (!rawConfig.flags) {
            rawConfig.flags = {};
        }

        rawConfig.server.resource_access_token_headers = {
            id: "P-Access-Token-ID",
            token: "P-Access-Token"
        };

        // Write the updated YAML back to the file
        const updatedYaml = yaml.dump(rawConfig);
        fs.writeFileSync(filePath, updatedYaml, "utf8");

        console.log(`Added new config option: resource_access_token_headers`);
    } catch (e) {
        console.log(
            `Unable to add new config option: resource_access_token_headers. Please add it manually. https://docs.fossorial.io/Pangolin/Configuration/config`
        );
        console.error(e);
    }

    console.log(`${version} migration complete`);
}
