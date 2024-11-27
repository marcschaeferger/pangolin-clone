import { z } from "zod";
import { fromError } from "zod-validation-error";
import path from "path";
import fs from "fs";
import yaml from "js-yaml";
import { fileURLToPath } from "url";

export const __FILENAME = fileURLToPath(import.meta.url);
export const __DIRNAME = path.dirname(__FILENAME);

export const APP_PATH = path.join("config");

const portSchema = z.number().positive().gt(0).lte(65535);

const environmentSchema = z.object({
    app: z.object({
        base_url: z.string().url(),
        log_level: z.enum(["debug", "info", "warn", "error"]),
        save_logs: z.boolean(),
    }),
    server: z.object({
        external_port: portSchema,
        internal_port: portSchema,
        internal_hostname: z.string(),
        secure_cookies: z.boolean(),
        signup_secret: z.string().optional(),
        session_cookie_name: z.string(),
    }),
    badger: z.object({
        session_query_parameter: z.string(),
        resource_session_cookie_name: z.string(),
    }),
    traefik: z.object({
        http_entrypoint: z.string(),
        https_entrypoint: z.string().optional(),
        cert_resolver: z.string().optional(),
        prefer_wildcard_cert: z.boolean().optional(),
    }),
    gerbil: z.object({
        start_port: portSchema,
        base_endpoint: z.string(),
        use_subdomain: z.boolean(),
        subnet_group: z.string(),
        block_size: z.number().positive().gt(0),
    }),
    rate_limit: z.object({
        window_minutes: z.number().positive().gt(0),
        max_requests: z.number().positive().gt(0),
    }),
    email: z
        .object({
            smtp_host: z.string().optional(),
            smtp_port: portSchema.optional(),
            smtp_user: z.string().optional(),
            smtp_pass: z.string().optional(),
            no_reply: z.string().email().optional(),
        })
        .optional(),
    flags: z
        .object({
            allow_org_subdomain_changing: z.boolean().optional(),
            require_email_verification: z.boolean().optional(),
            disable_signup_without_invite: z.boolean().optional(),
            require_signup_secret: z.boolean().optional(),
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
    const exampleConfigPath = path.join(__DIRNAME, "config.example.yml");
    if (fs.existsSync(exampleConfigPath)) {
        try {
            const exampleConfigContent = fs.readFileSync(
                exampleConfigPath,
                "utf8",
            );
            fs.writeFileSync(configFilePath1, exampleConfigContent, "utf8");
            environment = loadConfig(configFilePath1);
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(
                    `Error creating configuration file from example: ${error.message}`,
                );
            }
            throw error;
        }
    } else {
        throw new Error(
            "No configuration file found and no example configuration available",
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

process.env.SERVER_EXTERNAL_PORT =
    parsedConfig.data.server.external_port.toString();
process.env.SERVER_INTERNAL_PORT =
    parsedConfig.data.server.internal_port.toString();
process.env.FLAGS_EMAIL_VERIFICATION_REQUIRED = parsedConfig.data.flags
    ?.require_email_verification
    ? "true"
    : "false";
process.env.SESSION_COOKIE_NAME = parsedConfig.data.server.session_cookie_name;
process.env.RESOURCE_SESSION_COOKIE_NAME =
    parsedConfig.data.badger.resource_session_cookie_name;
process.env.RESOURCE_SESSION_QUERY_PARAM_NAME =
    parsedConfig.data.badger.session_query_parameter;

export default parsedConfig.data;
