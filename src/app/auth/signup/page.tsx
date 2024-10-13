import SignupForm from "@app/components/auth/SignupForm";
import { verifySession } from "@app/lib/auth/verifySession";
import { redirect } from "next/navigation";

export default async function Page() {
    const user = await verifySession();

    if (user) {
        redirect("/");
    }

    return (
        <>
            <SignupForm />
        </>
    );
}
