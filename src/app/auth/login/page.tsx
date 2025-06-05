import { verifySession } from "@app/lib/auth/verifySession";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache } from "react";
import DashboardLoginForm from "./DashboardLoginForm";
import { Mail } from "lucide-react";
import { pullEnv } from "@app/lib/pullEnv";
import { cleanRedirect } from "@app/lib/cleanRedirect";
import { idp } from "@server/db";
import { LoginFormIDP } from "@app/components/LoginForm";
import { priv } from "@app/lib/api";
import { AxiosResponse } from "axios";
import { ListIdpsResponse } from "@server/routers/idp";

export const dynamic = "force-dynamic";

export default async function Page(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const getUser = cache(verifySession);
    const user = await getUser();

    const isInvite = searchParams?.redirect?.includes("/invite");

    const env = pullEnv();

    const signUpDisabled = env.flags.disableSignupWithoutInvite;

    if (user) {
        redirect("/");
    }

    let redirectUrl: string | undefined = undefined;
    if (searchParams.redirect) {
        redirectUrl = cleanRedirect(searchParams.redirect as string);
    }

    const idpsRes = await cache(
        async () => await priv.get<AxiosResponse<ListIdpsResponse>>("/idp")
    )();
    const loginIdps = idpsRes.data.data.idps.map((idp) => ({
        idpId: idp.idpId,
        name: idp.name
    })) as LoginFormIDP[];

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

            <DashboardLoginForm redirect={redirectUrl} idps={loginIdps} />

            {(!signUpDisabled || isInvite) && (
                <p className="text-center text-muted-foreground mt-4">
                    Don't have an account?{" "}
                    <Link
                        href={
                            !redirectUrl
                                ? `/auth/signup`
                                : `/auth/signup?redirect=${redirectUrl}`
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
