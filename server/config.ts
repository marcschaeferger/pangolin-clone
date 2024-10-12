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
        external_base_url: z.string().url(),
        internal_base_url: z.string().url(),
        log_level: z.enum(["debug", "info", "warn", "error"]),
        save_logs: z.string().transform((val) => val === "true"),
        secure_cookies: z.string().transform((val) => val === "true"),
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

const configFilePath = path.join(APP_PATH, "config.yml");

const environment = loadConfig(configFilePath);

const parsedConfig = environmentSchema.safeParse(environment);

if (!parsedConfig.success) {
    const errors = fromError(parsedConfig.error);
    throw new Error(`Invalid configuration file: ${errors}`);
}

export default parsedConfig.data;
