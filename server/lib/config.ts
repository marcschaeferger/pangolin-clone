import { z } from "zod";
import { __DIRNAME, APP_VERSION } from "@server/lib/consts";
import { db } from "@server/db";
import { SupporterKey, supporterKey } from "@server/db";
import { eq } from "drizzle-orm";
import { license } from "@server/license/license";
import { configSchema, readConfigFile } from "./readConfigFile";

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
