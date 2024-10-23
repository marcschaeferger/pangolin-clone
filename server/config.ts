import { z } from "zod";
import { fromError } from "zod-validation-error";
import path from "path";
import fs from "fs";
import yaml from "js-yaml";

export const APP_PATH = path.join("config");

const environmentSchema = z.object({
    app: z.object({
        name: z.string(),
        base_url: z.string().url(),
        log_level: z.enum(["debug", "info", "warn", "error"]),
        save_logs: z.boolean(),
    }),
    server: z.object({
        external_port: z.number().positive().gt(0).lte(65535),
        internal_port: z.number().positive().gt(0).lte(65535),
        internal_hostname: z.string(),
        secure_cookies: z.boolean(),
    }),
    traefik: z.object({
        http_entrypoint: z.string(),
        https_entrypoint: z.string().optional(),
        cert_resolver: z.string().optional(),
    }),
    rate_limit: z.object({
        window_minutes: z.number().positive().gt(0),
        max_requests: z.number().positive().gt(0),
    }),
    email: z
        .object({
            smtp_host: z.string().optional(),
            smtp_port: z.number().positive().gt(0).lte(65535).optional(),
            smtp_user: z.string().optional(),
            smtp_pass: z.string().optional(),
            no_reply: z.string().email().optional(),
        })
        .optional(),
});

const loadConfig = (configPath: string) => {
    try {
        const yamlContent = fs.readFileSync(configPath, "utf8");
        const config = yaml.load(yamlContent);
        return config;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(
                `Error loading configuration file: ${error.message}`
            );
        }
        throw error;
    }
};

const configFilePath1 = path.join(APP_PATH, "config.yml");
const configFilePath2 = path.join(APP_PATH, "config.yaml");

let environment: any;
if (fs.existsSync(configFilePath1)) {
    environment = loadConfig(configFilePath1);
} else if (fs.existsSync(configFilePath2)) {
    environment = loadConfig(configFilePath2);
}
if (!environment) {
    const exampleConfigPath = path.join("config.example.yml");
    if (fs.existsSync(exampleConfigPath)) {
        try {
            const exampleConfigContent = fs.readFileSync(
                exampleConfigPath,
                "utf8"
            );
            fs.writeFileSync(configFilePath1, exampleConfigContent, "utf8");
            environment = loadConfig(configFilePath1);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(
                    `Error creating configuration file from example: ${error.message}`
                );
            }
            throw error;
        }
    } else {
        throw new Error(
            "No configuration file found and no example configuration available"
        );
    }
}

if (!environment) {
    throw new Error("No configuration file found");
}

const parsedConfig = environmentSchema.safeParse(environment);

if (!parsedConfig.success) {
    const errors = fromError(parsedConfig.error);
    throw new Error(`Invalid configuration file: ${errors}`);
}

process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL = new URL(
    "/api/v1",
    parsedConfig.data.app.base_url
).href;
process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL = new URL(
    "/api/v1",
    `http://${parsedConfig.data.server.internal_hostname}:${parsedConfig.data.server.external_port}`
).href;
process.env.NEXT_PUBLIC_APP_NAME = parsedConfig.data.app.name;

export default parsedConfig.data;
