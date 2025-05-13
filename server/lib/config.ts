import { z } from "zod";
import { __DIRNAME, APP_VERSION } from "@server/lib/consts";
import db from "@server/db";
import { SupporterKey, supporterKey } from "@server/db/schemas";
import { eq } from "drizzle-orm";
import { license } from "@server/license/license";
import { readConfigFile } from "./readConfigFile";
import stoi from "./stoi";
import { passwordSchema } from "@server/auth/passwordSchema";

const portSchema = z.number().positive().gt(0).lte(65535);

const getEnvOrYaml = (envVar: string) => (valFromYaml: any) => {
    return process.env[envVar] ?? valFromYaml;
};

const configSchema = z.object({
    app: z.object({
        dashboard_url: z
            .string()
            .url()
            .optional()
            .pipe(z.string().url())
            .transform((url) => url.toLowerCase()),
        log_level: z
            .enum(["debug", "info", "warn", "error"])
            .optional()
            .default("info"),
        save_logs: z.boolean().optional().default(false),
        log_failed_attempts: z.boolean().optional().default(false)
    }),
    domains: z
        .record(
            z.string(),
            z.object({
                base_domain: z
                    .string()
                    .nonempty("base_domain must not be empty")
                    .transform((url) => url.toLowerCase()),
                cert_resolver: z.string().optional().default("letsencrypt"),
                prefer_wildcard_cert: z.boolean().optional().default(false)
            })
        )
        .refine(
            (domains) => {
                const keys = Object.keys(domains);

                if (keys.length === 0) {
                    return false;
                }

                return true;
            },
            {
                message: "At least one domain must be defined"
            }
        ),
    server: z.object({
        integration_port: portSchema
            .optional()
            .default(3003)
            .transform(stoi)
            .pipe(portSchema.optional()),
        external_port: portSchema
            .optional()
            .default(3000)
            .transform(stoi)
            .pipe(portSchema),
        internal_port: portSchema
            .optional()
            .default(3001)
            .transform(stoi)
            .pipe(portSchema),
        next_port: portSchema
            .optional()
            .default(3002)
            .transform(stoi)
            .pipe(portSchema),
        internal_hostname: z
            .string()
            .optional()
            .default("pangolin")
            .transform((url) => url.toLowerCase()),
        session_cookie_name: z.string().optional().default("p_session_token"),
        resource_access_token_param: z.string().optional().default("p_token"),
        resource_access_token_headers: z
            .object({
                id: z.string().optional().default("P-Access-Token-Id"),
                token: z.string().optional().default("P-Access-Token")
            })
            .optional()
            .default({}),
        resource_session_request_param: z
            .string()
            .optional()
            .default("resource_session_request_param"),
        dashboard_session_length_hours: z
            .number()
            .positive()
            .gt(0)
            .optional()
            .default(720),
        resource_session_length_hours: z
            .number()
            .positive()
            .gt(0)
            .optional()
            .default(720),
        cors: z
            .object({
                origins: z.array(z.string()).optional(),
                methods: z.array(z.string()).optional(),
                allowed_headers: z.array(z.string()).optional(),
                credentials: z.boolean().optional()
            })
            .optional(),
        trust_proxy: z.boolean().optional().default(true),
        secret: z
            .string()
            .optional()
            .transform(getEnvOrYaml("SERVER_SECRET"))
            .pipe(z.string().min(8))
    }),
    traefik: z
        .object({
            http_entrypoint: z.string().optional().default("web"),
            https_entrypoint: z.string().optional().default("websecure"),
            additional_middlewares: z.array(z.string()).optional()
        })
        .optional()
        .default({}),
    gerbil: z
        .object({
            start_port: portSchema
                .optional()
                .default(51820)
                .transform(stoi)
                .pipe(portSchema),
            base_endpoint: z
                .string()
                .optional()
                .pipe(z.string())
                .transform((url) => url.toLowerCase()),
            use_subdomain: z.boolean().optional().default(false),
            subnet_group: z.string().optional().default("100.89.137.0/20"),
            block_size: z.number().positive().gt(0).optional().default(24),
            site_block_size: z.number().positive().gt(0).optional().default(30)
        })
        .optional()
        .default({}),
    rate_limits: z
        .object({
            global: z
                .object({
                    window_minutes: z
                        .number()
                        .positive()
                        .gt(0)
                        .optional()
                        .default(1),
                    max_requests: z
                        .number()
                        .positive()
                        .gt(0)
                        .optional()
                        .default(500)
                })
                .optional()
                .default({}),
            auth: z
                .object({
                    window_minutes: z.number().positive().gt(0),
                    max_requests: z.number().positive().gt(0)
                })
                .optional()
        })
        .optional()
        .default({}),
    email: z
        .object({
            smtp_host: z.string().optional(),
            smtp_port: portSchema.optional(),
            smtp_user: z.string().optional(),
            smtp_pass: z.string().optional(),
            smtp_secure: z.boolean().optional(),
            smtp_tls_reject_unauthorized: z.boolean().optional(),
            no_reply: z.string().email().optional()
        })
        .optional(),
    users: z.object({
        server_admin: z.object({
            email: z
                .string()
                .email()
                .optional()
                .transform(getEnvOrYaml("USERS_SERVERADMIN_EMAIL"))
                .pipe(z.string().email())
                .transform((v) => v.toLowerCase()),
            password: passwordSchema
                .optional()
                .transform(getEnvOrYaml("USERS_SERVERADMIN_PASSWORD"))
                .pipe(passwordSchema)
        })
    }),
    flags: z
        .object({
            require_email_verification: z.boolean().optional(),
            disable_signup_without_invite: z.boolean().optional(),
            disable_user_create_org: z.boolean().optional(),
            allow_raw_resources: z.boolean().optional(),
            allow_base_domain_resources: z.boolean().optional(),
            allow_local_sites: z.boolean().optional(),
            enable_integration_api: z.boolean().optional()
        })
        .optional()
});

export class Config {
    private rawConfig!: z.infer<typeof configSchema>;

    supporterData: SupporterKey | null = null;

    supporterHiddenUntil: number | null = null;

    isDev: boolean = process.env.ENVIRONMENT !== "prod";

    constructor() {
        this.load();
    }

    public load() {
        const parsedConfig = readConfigFile();

        process.env.APP_VERSION = APP_VERSION;

        process.env.NEXT_PORT = parsedConfig.server.next_port.toString();
        process.env.SERVER_EXTERNAL_PORT =
            parsedConfig.server.external_port.toString();
        process.env.SERVER_INTERNAL_PORT =
            parsedConfig.server.internal_port.toString();
        process.env.FLAGS_EMAIL_VERIFICATION_REQUIRED = parsedConfig.flags
            ?.require_email_verification
            ? "true"
            : "false";
        process.env.FLAGS_ALLOW_RAW_RESOURCES = parsedConfig.flags
            ?.allow_raw_resources
            ? "true"
            : "false";
        process.env.SESSION_COOKIE_NAME =
            parsedConfig.server.session_cookie_name;
        process.env.EMAIL_ENABLED = parsedConfig.email ? "true" : "false";
        process.env.DISABLE_SIGNUP_WITHOUT_INVITE = parsedConfig.flags
            ?.disable_signup_without_invite
            ? "true"
            : "false";
        process.env.DISABLE_USER_CREATE_ORG = parsedConfig.flags
            ?.disable_user_create_org
            ? "true"
            : "false";
        process.env.RESOURCE_ACCESS_TOKEN_PARAM =
            parsedConfig.server.resource_access_token_param;
        process.env.RESOURCE_ACCESS_TOKEN_HEADERS_ID =
            parsedConfig.server.resource_access_token_headers.id;
        process.env.RESOURCE_ACCESS_TOKEN_HEADERS_TOKEN =
            parsedConfig.server.resource_access_token_headers.token;
        process.env.RESOURCE_SESSION_REQUEST_PARAM =
            parsedConfig.server.resource_session_request_param;
        process.env.FLAGS_ALLOW_BASE_DOMAIN_RESOURCES = parsedConfig.flags
            ?.allow_base_domain_resources
            ? "true"
            : "false";
        process.env.DASHBOARD_URL = parsedConfig.app.dashboard_url;

        license.setServerSecret(parsedConfig.server.secret);

        this.checkKeyStatus();

        this.rawConfig = parsedConfig;
    }

    private async checkKeyStatus() {
        const licenseStatus = await license.check();
        if (!licenseStatus.isHostLicensed) {
            this.checkSupporterKey();
        }
    }

    public getRawConfig() {
        return this.rawConfig;
    }

    public getNoReplyEmail(): string | undefined {
        return (
            this.rawConfig.email?.no_reply || this.rawConfig.email?.smtp_user
        );
    }

    public getDomain(domainId: string) {
        return this.rawConfig.domains[domainId];
    }

    public hideSupporterKey(days: number = 7) {
        const now = new Date().getTime();

        if (this.supporterHiddenUntil && now < this.supporterHiddenUntil) {
            return;
        }

        this.supporterHiddenUntil = now + 1000 * 60 * 60 * 24 * days;
    }

    public isSupporterKeyHidden() {
        const now = new Date().getTime();

        if (this.supporterHiddenUntil && now < this.supporterHiddenUntil) {
            return true;
        }

        return false;
    }

    public async checkSupporterKey() {
        const [key] = await db.select().from(supporterKey).limit(1);

        if (!key) {
            return;
        }

        const { key: licenseKey, githubUsername } = key;

        try {
            const response = await fetch(
                "https://api.fossorial.io/api/v1/license/validate",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        licenseKey,
                        githubUsername
                    })
                }
            );

            if (!response.ok) {
                this.supporterData = key;
                return;
            }

            const data = await response.json();

            if (!data.data.valid) {
                this.supporterData = {
                    ...key,
                    valid: false
                };
                return;
            }

            this.supporterData = {
                ...key,
                tier: data.data.tier,
                valid: true
            };

            // update the supporter key in the database
            await db
                .update(supporterKey)
                .set({
                    tier: data.data.tier || null,
                    phrase: data.data.cutePhrase || null,
                    valid: true
                })
                .where(eq(supporterKey.keyId, key.keyId));
        } catch (e) {
            this.supporterData = key;
            console.error("Failed to validate supporter key", e);
        }
    }

    public getSupporterData() {
        return this.supporterData;
    }
}

export const config = new Config();

export default config;
