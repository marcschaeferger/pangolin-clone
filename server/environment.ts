import { z } from "zod";
import { fromError } from "zod-validation-error";

const environmentSchema = z.object({
    ENVIRONMENT: z.string(),
    LOG_LEVEL: z.string(),
    SAVE_LOGS: z.string().transform((val) => val === "true"),
    PORT: z.string(),
    INTERNAL_PORT: z.string(),
    CONFIG_PATH: z.string(),
    API_VERSION: z.string(),
});

const environment = {
    ENVIRONMENT: (process.env.ENVIRONMENT as string) || "dev",
    LOG_LEVEL: (process.env.LOG_LEVEL as string) || "debug",
    SAVE_LOGS: (process.env.SAVE_LOGS as string) || "false",
    PORT: (process.env.PORT as string) || "3000",
    INTERNAL_PORT: (process.env.INTERNAL_PORT as string) || "3001",
    CONFIG_PATH: process.env.CONFIG_PATH as string,
    API_VERSION: (process.env.API_VERSION as string) || "v1",
};

const parsedConfig = environmentSchema.safeParse(environment);

if (!parsedConfig.success) {
    const errors = fromError(parsedConfig.error);
    throw new Error(`Invalid environment configuration: ${errors}`);
}

export default parsedConfig.data;
