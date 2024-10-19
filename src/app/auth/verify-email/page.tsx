import VerifyEmailForm from "@app/app/auth/verify-email/VerifyEmailForm";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";

export default async function Page({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
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
