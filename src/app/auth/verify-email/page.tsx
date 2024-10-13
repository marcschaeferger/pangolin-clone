import VerifyEmailForm from "@app/components/auth/VerifyEmailForm";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";

export default async function Page() {
    const user = await verifySession();

    if (!user) {
        redirect("/");
    }

    if (user.emailVerified) {
        redirect("/");
    }

    console.log(user.email)

    return (
        <>
            <VerifyEmailForm email={user.email}/>
        </>
    );
}
