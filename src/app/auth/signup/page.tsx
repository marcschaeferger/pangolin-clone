import SignupForm from "@app/app/auth/signup/SignupForm";
import { verifySession } from "@app/lib/auth/verifySession";
import { cleanRedirect } from "@app/lib/cleanRedirect";
import { pullEnv } from "@app/lib/pullEnv";
import { Mail } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache } from "react";

export const dynamic = "force-dynamic";

export default async function Page(props: {
    searchParams: Promise<{ redirect: string | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const getUser = cache(verifySession);
    const user = await getUser();

    const env = pullEnv();

    const isInvite = searchParams?.redirect?.includes("/invite");

    if (env.flags.disableSignupWithoutInvite && !isInvite) {
        redirect("/");
    }

    if (user) {
        redirect("/");
    }

    let inviteId;
    let inviteToken;
    if (searchParams.redirect && isInvite) {
        const parts = searchParams.redirect.split("token=");
        if (parts.length) {
            const token = parts[1];
            const tokenParts = token.split("-");
            if (tokenParts.length === 2) {
                inviteId = tokenParts[0];
                inviteToken = tokenParts[1];
            }
        }
    }

    let redirectUrl: string | undefined;
    if (searchParams.redirect) {
        redirectUrl = cleanRedirect(searchParams.redirect);
    }

    return (
        <>
            {isInvite && (
                <div className="border rounded-md p-3 mb-4 bg-card">
                    <div className="flex flex-col items-center">
                        <Mail className="w-12 h-12 mb-4 text-primary" />
                        <h2 className="text-2xl font-bold mb-2 text-center">
                            Looks like you've been invited!
                        </h2>
                        <p className="text-center">
                            To accept the invite, you must log in or create an
                            account.
                        </p>
                    </div>
                </div>
            )}

            <SignupForm
                redirect={redirectUrl}
                inviteToken={inviteToken}
                inviteId={inviteId}
            />

            <p className="text-center text-muted-foreground mt-4">
                Already have an account?{" "}
                <Link
                    href={
                        !redirectUrl
                            ? `/auth/login`
                            : `/auth/login?redirect=${redirectUrl}`
                    }
                    className="underline"
                >
                    Log in
                </Link>
            </p>
        </>
    );
}
