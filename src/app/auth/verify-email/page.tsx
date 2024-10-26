import VerifyEmailForm from "@app/app/auth/verify-email/VerifyEmailForm";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";

export default async function Page(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    if (process.env.NEXT_PUBLIC_FLAGS_EMAIL_VERIFICATION_REQUIRED !== "true") {
        redirect("/");
    }

    const searchParams = await props.searchParams;
    const user = await verifySession();

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
