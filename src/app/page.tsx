import { verifySession } from "@app/lib/verifySession";
import { LandingProvider } from "@app/providers/LandingProvider";
import { redirect } from "next/navigation";

export default async function Page() {
    const user = await verifySession();

    if (!user) {
        redirect("/auth/login");
    }

    return (
        <>
            <LandingProvider user={user}>
                <p>You are logged in!</p>
            </LandingProvider>
        </>
    );
}
