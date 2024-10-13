import SignupForm from "@app/components/SignupForm";
import { verifySession } from "@app/lib/verifySession";
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
