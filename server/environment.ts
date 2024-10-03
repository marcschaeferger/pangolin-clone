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
    EMAIL_SMTP_HOST: z.string().optional(),
    EMAIL_SMTP_PORT: z
        .string()
        .optional()
        .transform((val) => {
            if (val) {
                return parseInt(val, 10);
            }
            return val;
        })
        .pipe(z.number().optional()),
    EMAIL_SMTP_USER: z.string().optional(),
    EMAIL_SMTP_PASS: z.string().optional(),
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
    EMAIL_SMTP_HOST: process.env.EMAIL_SMTP_HOST as string,
    EMAIL_SMTP_PORT: process.env.EMAIL_SMTP_PORT as string,
    EMAIL_SMTP_USER: process.env.EMAIL_SMTP_USER as string,
    EMAIL_SMTP_PASS: process.env.EMAIL_SMTP_PASS as string,
};

const parsedConfig = environmentSchema.safeParse(environment);

if (!parsedConfig.success) {
    const errors = fromError(parsedConfig.error);
    throw new Error(`Invalid environment configuration: ${errors}`);
}

export default parsedConfig.data;
