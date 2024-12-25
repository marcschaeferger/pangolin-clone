import { verifySession } from "@app/lib/auth/verifySession";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache } from "react";
import DashboardLoginForm from "./DashboardLoginForm";
import { Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Page(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const getUser = cache(verifySession);
    const user = await getUser();

    const isInvite = searchParams?.redirect?.includes("/invite");

    const signUpDisabled = process.env.DISABLE_SIGNUP_WITHOUT_INVITE === "true";

    if (user) {
        redirect("/");
    }

    return (
        <>
            {isInvite && (
                <div className="border rounded-md p-3 mb-4">
                    <div className="flex flex-col items-center">
                        <Mail className="w-12 h-12 mb-4 text-primary" />
                        <h2 className="text-2xl font-bold mb-2 text-center">
                            Looks like you've been invited!
                        </h2>
                        <p className="text-center">
                            To accept the invite, you must login or create an
                            account.
                        </p>
                    </div>
                </div>
            )}

            <DashboardLoginForm redirect={searchParams.redirect as string} />

            {(!signUpDisabled || isInvite) && (
                <p className="text-center text-muted-foreground mt-4">
                    Don't have an account?{" "}
                    <Link
                        href={
                            !searchParams.redirect
                                ? `/auth/signup`
                                : `/auth/signup?redirect=${searchParams.redirect}`
                        }
                        className="underline"
                    >
                        Sign up
                    </Link>
                </p>
            )}
        </>
    );
}
