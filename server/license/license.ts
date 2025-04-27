// This file is licensed under the Fossorial Commercial License.
// Unauthorized use, copying, modification, or distribution is strictly prohibited.
//
// Copyright (c) 2025 Fossorial LLC. All rights reserved.

import db from "@server/db";
import { hostMeta, licenseKey, sites } from "@server/db/schemas";
import logger from "@server/logger";
import NodeCache from "node-cache";
import { validateJWT } from "./licenseJwt";
import { count, eq } from "drizzle-orm";
import moment from "moment";

export type LicenseStatus = {
    isHostLicensed: boolean; // Are there any license keys?
    isLicenseValid: boolean; // Is the license key valid?
    hostId: string; // Host ID
    maxSites?: number;
    usedSites?: number;
};

export type LicenseKeyCache = {
    licenseKey: string;
    valid: boolean;
    iat?: Date;
    type?: "LICENSE" | "SITES";
    numSites?: number;
};

type ActivateLicenseKeyAPIResponse = {
    data: {
        instanceId: string;
    };
    success: boolean;
    error: string;
    message: string;
    status: number;
};

type ValidateLicenseAPIResponse = {
    data: {
        licenseKeys: {
            [key: string]: string;
        };
    };
    success: boolean;
    error: string;
    message: string;
    status: number;
};

type TokenPayload = {
    valid: boolean;
    type: "LICENSE" | "SITES";
    quantity: number;
    terminateAt: string; // ISO
    iat: number; // Issued at
};

export class License {
    private phoneHomeInterval = 6 * 60 * 60; // 6 hours = 6 * 60 * 60 = 21600 seconds
    private validationServerUrl =
        "https://api.dev.fossorial.io/api/v1/license/professional/validate";
    private activationServerUrl =
        "https://api.dev.fossorial.io/api/v1/license/professional/activate";

    private statusCache = new NodeCache({ stdTTL: this.phoneHomeInterval });
    private licenseKeyCache = new NodeCache();

    private ephemeralKey!: string;
    private statusKey = "status";

    private publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAx9RKc8cw+G8r7h/xeozF
FNkRDggQfYO6Ae+EWHGujZ9WYAZ10spLh9F/zoLhhr3XhsjpoRXwMfgNuO5HstWf
CYM20I0l7EUUMWEyWd4tZLd+5XQ4jY5xWOCWyFJAGQSp7flcRmxdfde+l+xg9eKl
apbY84aVp09/GqM96hCS+CsQZrhohu/aOqYVB/eAhF01qsbmiZ7Y3WtdhTldveYt
h4mZWGmjf8d/aEgePf/tk1gp0BUxf+Ae5yqoAqU+6aiFbjJ7q1kgxc18PWFGfE9y
zSk+OZk887N5ThQ52154+oOUCMMR2Y3t5OH1hVZod51vuY2u5LsQXsf+87PwB91y
LQIDAQAB
-----END PUBLIC KEY-----`;

    constructor(private hostId: string) {
        this.ephemeralKey = Buffer.from(
            JSON.stringify({ ts: new Date().toISOString() })
        ).toString("base64");

        setInterval(
            () => {
                this.check();
            },
            1000 * 60 * 60
        ); // 1 hour = 60 * 60 = 3600 seconds
    }

    public listKeys(): LicenseKeyCache[] {
        const keys = this.licenseKeyCache.keys();
        return keys.map((key) => {
            return this.licenseKeyCache.get<LicenseKeyCache>(key)!;
        });
    }

    public async forceRecheck() {
        this.statusCache.flushAll();
        this.licenseKeyCache.flushAll();

        return await this.check();
    }

    public async isUnlocked(): Promise<boolean> {
        const status = await this.check();
        if (status.isHostLicensed) {
            if (status.isLicenseValid) {
                return true;
            }
        }
        return false;
    }

    public async check(): Promise<LicenseStatus> {
        // Set used sites
        const [siteCount] = await db
            .select({
                value: count()
            })
            .from(sites);

        const status: LicenseStatus = {
            hostId: this.hostId,
            isHostLicensed: true,
            isLicenseValid: false,
            maxSites: undefined,
            usedSites: 150
        };

        try {
            if (this.statusCache.has(this.statusKey)) {
                const res = this.statusCache.get("status") as LicenseStatus;
                res.usedSites = status.usedSites;
                return res;
            }

            // Invalidate all
            this.licenseKeyCache.flushAll();

            logger.debug("Checking license status...");

            const allKeysRes = await db.select().from(licenseKey);

            if (allKeysRes.length === 0) {
                status.isHostLicensed = false;
                return status;
            }

            // Validate stored license keys
            for (const key of allKeysRes) {
                try {
                    const payload = validateJWT<TokenPayload>(
                        key.token,
                        this.publicKey
                    );

                    this.licenseKeyCache.set<LicenseKeyCache>(
                        key.licenseKeyId,
                        {
                            licenseKey: key.licenseKeyId,
                            valid: payload.valid,
                            type: payload.type,
                            numSites: payload.quantity,
                            iat: new Date(payload.iat * 1000)
                        }
                    );
                } catch (e) {
                    logger.error(
                        `Error validating license key: ${key.licenseKeyId}`
                    );
                    logger.error(e);

                    this.licenseKeyCache.set<LicenseKeyCache>(
                        key.licenseKeyId,
                        {
                            licenseKey: key.licenseKeyId,
                            valid: false
                        }
                    );
                }
            }

            const keys = allKeysRes.map((key) => ({
                licenseKey: key.licenseKeyId,
                instanceId: key.instanceId
            }));

            let apiResponse: ValidateLicenseAPIResponse | undefined;
            try {
                // Phone home to validate license keys
                apiResponse = await this.phoneHome(keys);

                if (!apiResponse?.success) {
                    throw new Error(apiResponse?.error);
                }
            } catch (e) {
                logger.error("Error communicating with license server:");
                logger.error(e);
            }

            logger.debug("Validate response", apiResponse);

            // Check and update all license keys with server response
            for (const key of keys) {
                try {
                    const cached = this.licenseKeyCache.get<LicenseKeyCache>(
                        key.licenseKey
                    )!;
                    const licenseKeyRes =
                        apiResponse?.data?.licenseKeys[key.licenseKey];

                    if (!apiResponse || !licenseKeyRes) {
                        logger.debug(
                            `No response from server for license key: ${key.licenseKey}`
                        );
                        if (cached.iat) {
                            const exp = moment(cached.iat)
                                .add(7, "days")
                                .toDate();
                            if (exp > new Date()) {
                                logger.debug(
                                    `Using cached license key: ${key.licenseKey}, valid ${cached.valid}`
                                );
                                continue;
                            }
                        }

                        logger.debug(
                            `Can't trust license key: ${key.licenseKey}`
                        );
                        cached.valid = false;
                        this.licenseKeyCache.set<LicenseKeyCache>(
                            key.licenseKey,
                            cached
                        );
                        continue;
                    }

                    const payload = validateJWT<TokenPayload>(
                        licenseKeyRes,
                        this.publicKey
                    );
                    cached.valid = payload.valid;
                    cached.type = payload.type;
                    cached.numSites = payload.quantity;
                    cached.iat = new Date(payload.iat * 1000);

                    await db
                        .update(licenseKey)
                        .set({
                            token: licenseKeyRes
                        })
                        .where(eq(licenseKey.licenseKeyId, key.licenseKey));

                    this.licenseKeyCache.set<LicenseKeyCache>(
                        key.licenseKey,
                        cached
                    );
                } catch (e) {
                    logger.error(`Error validating license key: ${key}`);
                    logger.error(e);
                }
            }

            // Compute host status
            for (const key of keys) {
                const cached = this.licenseKeyCache.get<LicenseKeyCache>(
                    key.licenseKey
                )!;

                logger.debug("Checking key", cached);

                if (cached.type === "LICENSE") {
                    status.isLicenseValid = cached.valid;
                }

                if (!cached.valid) {
                    continue;
                }

                if (!status.maxSites) {
                    status.maxSites = 0;
                }

                status.maxSites += cached.numSites || 0;
            }
        } catch (error) {
            logger.error("Error checking license status:");
            logger.error(error);
        }

        this.statusCache.set(this.statusKey, status);
        return status;
    }

    public async activateLicenseKey(key: string) {
        const [existingKey] = await db
            .select()
            .from(licenseKey)
            .where(eq(licenseKey.licenseKeyId, key))
            .limit(1);

        if (existingKey) {
            throw new Error("License key already exists");
        }

        let instanceId: string | undefined;
        try {
            // Call activate
            const apiResponse = await fetch(this.activationServerUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    licenseKey: key,
                    instanceName: this.hostId
                })
            });

            const data = await apiResponse.json();

            if (!data.success) {
                throw new Error(`${data.message || data.error}`);
            }

            const response = data as ActivateLicenseKeyAPIResponse;

            if (!response.data) {
                throw new Error("No response from server");
            }

            if (!response.data.instanceId) {
                throw new Error("No instance ID in response");
            }

            instanceId = response.data.instanceId;
        } catch (error) {
            throw Error(`Error activating license key: ${error}`);
        }

        // Phone home to validate license key
        const keys = [
            {
                licenseKey: key,
                instanceId: instanceId!
            }
        ];

        let validateResponse: ValidateLicenseAPIResponse;
        try {
            validateResponse = await this.phoneHome(keys);

            if (!validateResponse) {
                throw new Error("No response from server");
            }

            if (!validateResponse.success) {
                throw new Error(validateResponse.error);
            }

            // Validate the license key
            const licenseKeyRes = validateResponse.data.licenseKeys[key];
            if (!licenseKeyRes) {
                throw new Error("Invalid license key");
            }

            const payload = validateJWT<TokenPayload>(
                licenseKeyRes,
                this.publicKey
            );

            if (!payload.valid) {
                throw new Error("Invalid license key");
            }

            // Store the license key in the database
            await db.insert(licenseKey).values({
                licenseKeyId: key,
                token: licenseKeyRes,
                instanceId: instanceId!
            });
        } catch (error) {
            throw Error(`Error validating license key: ${error}`);
        }

        // Invalidate the cache and re-compute the status
        return await this.forceRecheck();
    }

    private async phoneHome(
        keys: {
            licenseKey: string;
            instanceId: string;
        }[]
    ): Promise<ValidateLicenseAPIResponse> {
        const response = await fetch(this.validationServerUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                licenseKeys: keys,
                ephemeralKey: this.ephemeralKey,
                instanceName: this.hostId
            })
        });

        const data = await response.json();

        return data as ValidateLicenseAPIResponse;
    }
}

const [info] = await db.select().from(hostMeta).limit(1);

if (!info) {
    throw new Error("Host information not found");
}

export const license = new License(info.hostMetaId);

export default license;
