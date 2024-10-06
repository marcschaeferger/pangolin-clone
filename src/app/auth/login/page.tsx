import LoginForm from "@app/components/LoginForm";
import { verifySession } from "@app/lib/verifySession";
import { redirect } from "next/navigation";

export async function Page() {
    const { user } = await verifySession();

    if (user) {
        redirect("/");
    }

    return (
        <>
            <LoginForm redirect={"test"} />
        </>
    );
}

export default Page;

