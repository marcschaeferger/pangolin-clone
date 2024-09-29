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
});

const environment = {
    ENVIRONMENT: (process.env.ENVIRONMENT as string) || "dev",
    LOG_LEVEL: (process.env.LOG_LEVEL as string) || "debug",
    SAVE_LOGS: (process.env.SAVE_LOGS as string) || "false",
    CONFIG_PATH:
        (process.env.CONFIG_PATH as string) || path.join(__dirname, "config"),
};

const parsedConfig = environmentSchema.safeParse(environment);

if (!parsedConfig.success) {
    const errors = fromError(parsedConfig.error);
    throw new Error(`Invalid environment configuration: ${errors}`);
}

export default parsedConfig.data;
