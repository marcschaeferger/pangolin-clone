import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import {
    __DIRNAME,
    configFilePath1,
    configFilePath2
} from "@server/lib/consts";
import { loadAppVersion } from "@server/lib/loadAppVersion";
import { passwordSchema } from "@server/auth/passwordSchema";

const portSchema = z.number().positive().gt(0).lte(65535);
const hostnameSchema = z
    .string()
    .regex(
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)+([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$/
    )
    .or(z.literal("localhost"));

const environmentSchema = z.object({
    app: z.object({
        dashboard_url: z
            .string()
            .url()
            .transform((url) => url.toLowerCase()),
        base_domain: hostnameSchema,
        log_level: z.enum(["debug", "info", "warn", "error"]),
        save_logs: z.boolean()
    }),
    server: z.object({
        external_port: portSchema,
        internal_port: portSchema,
        next_port: portSchema,
        internal_hostname: z.string().transform((url) => url.toLowerCase()),
        secure_cookies: z.boolean(),
        session_cookie_name: z.string(),
        resource_session_cookie_name: z.string()
    }),
    traefik: z.object({
        http_entrypoint: z.string(),
        https_entrypoint: z.string().optional(),
        cert_resolver: z.string().optional(),
        prefer_wildcard_cert: z.boolean().optional()
    }),
    gerbil: z.object({
        start_port: portSchema,
        base_endpoint: z.string().transform((url) => url.toLowerCase()),
        use_subdomain: z.boolean(),
        subnet_group: z.string(),
        block_size: z.number().positive().gt(0)
    }),
    rate_limits: z.object({
        global: z.object({
            window_minutes: z.number().positive().gt(0),
            max_requests: z.number().positive().gt(0)
        }),
        auth: z
            .object({
                window_minutes: z.number().positive().gt(0),
                max_requests: z.number().positive().gt(0)
            })
            .optional()
    }),
    email: z
        .object({
            smtp_host: z.string(),
            smtp_port: portSchema,
            smtp_user: z.string(),
            smtp_pass: z.string(),
            no_reply: z.string().email()
        })
        .optional(),
    users: z.object({
        server_admin: z.object({
            email: z.string().email(),
            password: passwordSchema
        })
    }),
    flags: z
        .object({
            require_email_verification: z.boolean().optional(),
            disable_signup_without_invite: z.boolean().optional(),
            disable_user_create_org: z.boolean().optional()
        })
        .optional()
});

export class Config {
    private rawConfig!: z.infer<typeof environmentSchema>;

    constructor() {
        this.loadConfig();
    }

    public loadConfig() {
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

        let environment: any;
        if (fs.existsSync(configFilePath1)) {
            environment = loadConfig(configFilePath1);
        } else if (fs.existsSync(configFilePath2)) {
            environment = loadConfig(configFilePath2);
        }
        if (!environment) {
            const exampleConfigPath = path.join(
                __DIRNAME,
                "config.example.yml"
            );
            if (fs.existsSync(exampleConfigPath)) {
                try {
                    const exampleConfigContent = fs.readFileSync(
                        exampleConfigPath,
                        "utf8"
                    );
                    fs.writeFileSync(
                        configFilePath1,
                        exampleConfigContent,
                        "utf8"
                    );
                    environment = loadConfig(configFilePath1);
                } catch (error) {
                    if (error instanceof Error) {
                        throw new Error(
                            `Error creating configuration file from example: ${
                                error.message
                            }`
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

        const appVersion = loadAppVersion();
        if (!appVersion) {
            throw new Error("Could not load the application version");
        }
        process.env.APP_VERSION = appVersion;

        process.env.NEXT_PORT = parsedConfig.data.server.next_port.toString();
        process.env.SERVER_EXTERNAL_PORT =
            parsedConfig.data.server.external_port.toString();
        process.env.SERVER_INTERNAL_PORT =
            parsedConfig.data.server.internal_port.toString();
        process.env.FLAGS_EMAIL_VERIFICATION_REQUIRED = parsedConfig.data.flags
            ?.require_email_verification
            ? "true"
            : "false";
        process.env.SESSION_COOKIE_NAME =
            parsedConfig.data.server.session_cookie_name;
        process.env.RESOURCE_SESSION_COOKIE_NAME =
            parsedConfig.data.server.resource_session_cookie_name;
        process.env.EMAIL_ENABLED = parsedConfig.data.email ? "true" : "false";
        process.env.DISABLE_SIGNUP_WITHOUT_INVITE = parsedConfig.data.flags
            ?.disable_signup_without_invite
            ? "true"
            : "false";
        process.env.DISABLE_USER_CREATE_ORG = parsedConfig.data.flags
            ?.disable_user_create_org
            ? "true"
            : "false";

        this.rawConfig = parsedConfig.data;
    }

    public getRawConfig() {
        return this.rawConfig;
    }

    public getBaseDomain(): string {
        return this.rawConfig.app.base_domain;
    }
}

export const config = new Config();

export default config;
