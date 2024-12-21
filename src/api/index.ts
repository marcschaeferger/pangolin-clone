import { env } from "@app/lib/types/env";
import axios, { AxiosInstance } from "axios";

let apiInstance: AxiosInstance | null = null;

export function createApiClient({ env }: { env: env }): AxiosInstance {
    if (apiInstance) {
        return apiInstance;
    }

    if (apiInstance) {
        return apiInstance
    }

    let baseURL;
    const suffix = "api/v1";

    if (window.location.port === env.NEXT_PORT) {
        // this means the user is addressing the server directly
        baseURL = `${window.location.protocol}//${window.location.hostname}:${env.SERVER_EXTERNAL_PORT}/${suffix}`;
        axios.defaults.withCredentials = true;
    } else {
        // user is accessing through a proxy
        baseURL = window.location.origin + `/${suffix}`;
    }

    if (!baseURL) {
        throw new Error("Failed to create api client, invalid environment");
    }

    apiInstance = axios.create({
        baseURL,
        timeout: 10000,
        headers: {
            "Content-Type": "application/json"
        }
    });

    return apiInstance;
}

// we can pull from env var here becuase it is only used in the server
export const internal = axios.create({
    baseURL: `http://localhost:${process.env.SERVER_EXTERNAL_PORT}/api/v1`,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json"
    }
});

export const priv = axios.create({
    baseURL: `http://localhost:${process.env.SERVER_INTERNAL_PORT}/api/v1`,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json"
    }
});
