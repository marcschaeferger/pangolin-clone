import * as crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

export function encrypt(value: string, key: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return [
        iv.toString("base64"),
        encrypted.toString("base64"),
        authTag.toString("base64")
    ].join(":");
}

export function decrypt(encryptedValue: string, key: string): string {
    const [ivB64, encryptedB64, authTagB64] = encryptedValue.split(":");

    const iv = Buffer.from(ivB64, "base64");
    const encrypted = Buffer.from(encryptedB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]);
    return decrypted.toString("utf8");
}
