import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";
import { cache } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

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

    return (
        <>
            <ResetPasswordForm
                redirect={searchParams.redirect}
                tokenParam={searchParams.token}
                emailParam={searchParams.email}
            />
        </>
    );
}
