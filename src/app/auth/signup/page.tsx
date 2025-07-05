import SignupForm from "@app/app/auth/signup/SignupForm";
import { verifySession } from "@app/lib/auth/verifySession";
import { cleanRedirect } from "@app/lib/cleanRedirect";
import { pullEnv } from "@app/lib/pullEnv";
import { Mail } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getTranslations } from 'next-intl/server';
import { internal } from "@app/lib/api";
import { AxiosResponse } from "axios";

export const dynamic = "force-dynamic";

export default async function Page(props: {
    searchParams: Promise<{ redirect: string | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const getUser = cache(verifySession);
    const user = await getUser();
    const t = await getTranslations();

    const env = pullEnv();

    const isInvite = searchParams?.redirect?.includes("/invite") ?? false;

    if (env.flags.disableSignupWithoutInvite && !isInvite) {
        redirect("/");
    }

    if (user) {
        redirect("/");
    }

    let inviteId;
    let inviteToken;
    let isValidInvite = false;

    if (searchParams.redirect && isInvite) {
        // Handle URLs like "/invite?token=inviteId-tokenValue"
        const url = new URL(searchParams.redirect, 'http://localhost');
        const tokenParam = url.searchParams.get('token');
        if (tokenParam) {
            const tokenParts = tokenParam.split("-");
            if (tokenParts.length >= 2) {
                inviteId = tokenParts[0];
                inviteToken = tokenParts.slice(1).join("-"); // Handle tokens with multiple dashes

                // Verify if the invite is valid
                try {
                    const inviteRes = await internal.get<AxiosResponse<any>>(`/invite/details?token=${tokenParam}`);
                    isValidInvite = inviteRes.status === 200;
                } catch (e) {
                    isValidInvite = false;
                }
            }
        }
    }

    let redirectUrl: string | undefined;
    if (searchParams.redirect) {
        redirectUrl = cleanRedirect(searchParams.redirect);
    }

    return (
        <>
            {isInvite && isValidInvite && (
                <div className="border rounded-md p-3 mb-4 bg-card">
                    <div className="flex flex-col items-center">
                        <Mail className="w-12 h-12 mb-4 text-primary" />
                        <h2 className="text-2xl font-bold mb-2 text-center">
                            {t('inviteAlready')}
                        </h2>
                        <p className="text-center">
                            {t('inviteAlreadyDescriptionSignup')}
                        </p>
                    </div>
                </div>
            )}

            <SignupForm
                redirect={redirectUrl}
                inviteToken={inviteToken}
                inviteId={inviteId}
                isValidInvite={isValidInvite}
                isInvite={isInvite}
            />

            {!isInvite && (
                <p className="text-center text-muted-foreground mt-4">
                    {t('signupQuestion')}{" "}
                    <Link
                        href={
                            !redirectUrl
                                ? `/auth/login`
                                : `/auth/login?redirect=${redirectUrl}`
                        }
                        className="underline"
                    >
                        {t('login')}
                    </Link>
                </p>
            )}
        </>
    );
}
