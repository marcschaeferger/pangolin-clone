import { decodeHex } from "oslo/encoding";
import { TOTPController } from "oslo/otp";

export async function verifyTotpCode(
    code: string,
    secret: string,
): Promise<boolean> {
    const validOTP = await new TOTPController().verify(code, decodeHex(secret));

    if (!validOTP) {
        await new Promise((resolve) => setTimeout(resolve, 250)); // delay to prevent brute force attack
    }

    return validOTP;
}
