import LoginForm from "@app/app/auth/login/LoginForm";
import { verifySession } from "@app/lib/auth/verifySession";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Page(
    props: {
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
    }
) {
    const searchParams = await props.searchParams;
    const user = await verifySession();

    if (user) {
        redirect("/");
    }

    return (
        <>
            <LoginForm redirect={searchParams.redirect as string} />

            <p className="text-center text-muted-foreground mt-4">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="underline">
                    Sign up
                </Link>
            </p>
        </>
    );
}
