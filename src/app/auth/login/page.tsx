import LoginForm from "@app/components/auth/LoginForm";
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
            <LoginForm redirect={searchParams.redirect as string} />
        </>
    );
}
