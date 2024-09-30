import { z } from "zod";
import { fromError } from "zod-validation-error";
import path from "path";

const environmentSchema = z.object({
    ENVIRONMENT: z.enum(["dev", "prod"]),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
    SAVE_LOGS: z.string().transform((val) => val === "true"),
    CONFIG_PATH: z.string().transform((val) => {
        // validate the path and remove any trailing slashes
        const resolvedPath = path.resolve(val);
        return resolvedPath.endsWith(path.sep)
            ? resolvedPath.slice(0, -1)
            : resolvedPath;
    }),
    EXTERNAL_PORT: z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(z.number()),
    INTERNAL_PORT: z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(z.number()),
});

const environment = {
    ENVIRONMENT: (process.env.ENVIRONMENT as string) || "dev",
    LOG_LEVEL: (process.env.LOG_LEVEL as string) || "debug",
    SAVE_LOGS: (process.env.SAVE_LOGS as string) || "false",
    CONFIG_PATH:
        (process.env.CONFIG_PATH && path.join(process.env.CONFIG_PATH)) ||
        path.join("config"),
    EXTERNAL_PORT: (process.env.EXTERNAL_PORT as string) || "3000",
    INTERNAL_PORT: (process.env.INTERNAL_PORT as string) || "3001",
};

const parsedConfig = environmentSchema.safeParse(environment);

if (!parsedConfig.success) {
    const errors = fromError(parsedConfig.error);
    throw new Error(`Invalid environment configuration: ${errors}`);
}

export default parsedConfig.data;
