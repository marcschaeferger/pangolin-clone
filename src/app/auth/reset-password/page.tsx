import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";
import { cache } from "react";
import ResetPasswordForm from "./ResetPasswordForm";
import Link from "next/link";
import { cleanRedirect } from "@app/lib/cleanRedirect";

export const dynamic = "force-dynamic";

export default async function Page(props: {
    searchParams: Promise<{
        redirect: string | undefined;
        email: string | undefined;
        token: string | undefined;
    }>;
}) {
    const searchParams = await props.searchParams;
    const getUser = cache(verifySession);
    const user = await getUser();

    if (user) {
        redirect("/");
    }

    let redirectUrl: string | undefined = undefined;
    if (searchParams.redirect) {
        redirectUrl = cleanRedirect(searchParams.redirect);
    }

    return (
        <>
            <ResetPasswordForm
                redirect={searchParams.redirect}
                tokenParam={searchParams.token}
                emailParam={searchParams.email}
            />

            <p className="text-center text-muted-foreground mt-4">
                <Link
                    href={
                        !searchParams.redirect
                            ? `/auth/signup`
                            : `/auth/signup?redirect=${redirectUrl}`
                    }
                    className="underline"
                >
                    Go back to log in
                </Link>
            </p>
        </>
    );
}
