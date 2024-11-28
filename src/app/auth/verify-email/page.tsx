import VerifyEmailForm from "@app/app/auth/verify-email/VerifyEmailForm";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";
import { cache } from "react";

export const dynamic = "force-dynamic";

export default async function Page(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    if (process.env.FLAGS_EMAIL_VERIFICATION_REQUIRED !== "true") {
        redirect("/");
    }

    const searchParams = await props.searchParams;
    const getUser = cache(verifySession);
    const user = await getUser({ skipCheckVerifyEmail: true });

    if (!user) {
        redirect("/");
    }

    if (user.emailVerified) {
        redirect("/");
    }

    return (
        <>
            <VerifyEmailForm
                email={user.email}
                redirect={searchParams.redirect as string}
            />
        </>
    );
}
