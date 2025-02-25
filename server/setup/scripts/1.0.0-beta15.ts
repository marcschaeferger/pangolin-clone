import db from "@server/db";
import { configFilePath1, configFilePath2 } from "@server/lib/consts";
import fs from "fs";
import yaml from "js-yaml";
import { sql } from "drizzle-orm";

const version = "1.0.0-beta.15";

export default async function migration() {
    console.log(`Running setup script ${version}...`);

    try {
        db.transaction((trx) => {});

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

        const baseDomain = rawConfig.app.base_domain;
        const certResolver = rawConfig.traefik.cert_resolver;
        const preferWildcardCert = rawConfig.traefik.prefer_wildcard_cert;

        delete rawConfig.traefik.prefer_wildcard_cert;
        delete rawConfig.traefik.cert_resolver;
        delete rawConfig.app.base_domain;

        rawConfig.domains = {
            domain1: {
                base_domain: baseDomain
            }
        };

        if (certResolver) {
            rawConfig.domains.domain1.cert_resolver = certResolver;
        }

        if (preferWildcardCert) {
            rawConfig.domains.domain1.prefer_wildcard_cert = preferWildcardCert;
        }

        // Write the updated YAML back to the file
        const updatedYaml = yaml.dump(rawConfig);
        fs.writeFileSync(filePath, updatedYaml, "utf8");

        console.log(`Moved base_domain to new domains section`);
    } catch (e) {
        console.log(
            `Unable to migrate config file and move base_domain to domains. Error: ${e}`
        );
        return;
    }

    console.log(`${version} migration complete`);
}
