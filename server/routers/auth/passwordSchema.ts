import z from "zod";

export const passwordSchema = z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(64, { message: "Password must be at most 64 characters long" })
    .regex(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).*$/, {
        message: `Your password must meet the following conditions:
- At least one uppercase English letter.
- At least one lowercase English letter.
- At least one digit.
- At least one special character.`,
    });
