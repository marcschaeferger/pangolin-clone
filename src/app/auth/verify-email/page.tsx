import VerifyEmailForm from "@app/components/VerifyEmailForm";
import { verifySession } from "@app/lib/verifySession";
import { redirect } from "next/navigation";

export default async function Page() {
    const user = await verifySession();
    console.log(user)

    if (!user) {
        redirect("/");
    }

    if (user.emailVerified) {
        redirect("/");
    }

    return (
        <>
            <VerifyEmailForm email={user.email}/>
        </>
    );
}
