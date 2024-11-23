import { verifySession } from "@app/lib/auth/verifySession";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache } from "react";
import DashboardLoginForm from "./DashboardLoginForm";

export const dynamic = "force-dynamic";

export default async function Page(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const searchParams = await props.searchParams;
    const getUser = cache(verifySession);
    const user = await getUser();

    if (user) {
        redirect("/");
    }

    return (
        <>
            <DashboardLoginForm redirect={searchParams.redirect as string} />

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
        </>
    );
}
