import { z } from "zod";
import { fromError } from "zod-validation-error";
import path from "path";
import fs from "fs";
import yaml from "js-yaml";

export const APP_PATH = path.join("config");

const environmentSchema = z.object({
    app: z.object({
        name: z.string(),
        environment: z.enum(["dev", "prod"]),
        base_url: z.string().url(),
        log_level: z.enum(["debug", "info", "warn", "error"]),
        save_logs: z.string().transform((val) => val === "true"),
    }),
    server: z.object({
        external_port: z
            .string()
            .transform((val) => parseInt(val, 10))
            .pipe(z.number()),
        internal_port: z
            .string()
            .transform((val) => parseInt(val, 10))
            .pipe(z.number()),
        internal_hostname: z.string(),
        secure_cookies: z.string().transform((val) => val === "true"),
    }),
    rate_limit: z.object({
        window_minutes: z
            .string()
            .transform((val) => parseInt(val, 10))
            .pipe(z.number()),
        max_requests: z
            .string()
            .transform((val) => parseInt(val, 10))
            .pipe(z.number()),
    }),
    email: z
        .object({
            smtp_host: z.string().optional(),
            smtp_port: z
                .string()
                .optional()
                .transform((val) => {
                    if (val) {
                        return parseInt(val, 10);
                    }
                    return val;
                })
                .pipe(z.number().optional()),
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
                `Error loading configuration file: ${error.message}`,
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
    throw new Error("No configuration file found");
}

const parsedConfig = environmentSchema.safeParse(environment);

if (!parsedConfig.success) {
    const errors = fromError(parsedConfig.error);
    throw new Error(`Invalid configuration file: ${errors}`);
}

process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL = new URL(
    "/api/v1",
    parsedConfig.data.app.base_url,
).href;
process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL = new URL(
    "/api/v1",
    `http://${parsedConfig.data.server.internal_hostname}:${parsedConfig.data.server.external_port}`,
).href;
process.env.NEXT_PUBLIC_APP_NAME = parsedConfig.data.app.name;

export default parsedConfig.data;
