import { verifySession } from "@app/lib/verifySession";
import { LandingProvider } from "@app/providers/LandingProvider";
import { redirect } from "next/navigation";

export default async function Page() {
    const user = await verifySession();

    if (!user) {
        redirect("/auth/login");
    }

    console.log(user);

    return (
        <>
            <LandingProvider user={user}>
                <p>Logged in as {user.email}</p>
            </LandingProvider>
        </>
    );
}
