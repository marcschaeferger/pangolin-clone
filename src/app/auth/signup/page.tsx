import SignupForm from "@app/app/auth/signup/SignupForm";
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
            <SignupForm redirect={searchParams.redirect as string} />

            <p className="text-center text-muted-foreground mt-4">
                Already have an account?{" "}
                <Link href="/auth/login" className="underline">
                    Log in
                </Link>
            </p>
        </>
    );
}
