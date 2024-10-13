import SignupForm from "@app/components/auth/SignupForm";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";

export default async function Page({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const user = await verifySession();

    if (user) {
        redirect("/");
    }

    return (
        <>
            <SignupForm redirect={searchParams.redirect as string} />
        </>
    );
}
