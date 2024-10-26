import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import { verifySession } from "@app/lib/auth/verifySession";
import { LandingProvider } from "@app/providers/LandingProvider";
import { ListOrgsResponse } from "@server/routers/org";
import { AxiosResponse } from "axios";
import { ArrowUpLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Page(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {

    const params = await props.searchParams;
    const user = await verifySession();

    console.log("page.tsx user", user);

    if (!user) {
        // redirect("/auth/login");
        return;
    }

    // let orgs: ListOrgsResponse["orgs"] = [];
    // try {
    //     const res = await internal.get<AxiosResponse<ListOrgsResponse>>(
    //         `/orgs`,
    //         await authCookieHeader()
    //     );
    //     if (res && res.data.data.orgs) {
    //         orgs = res.data.data.orgs;
    //     }
    // } catch (e) {}

    return (
        <>
            <LandingProvider user={user}>
                <p>Logged in as {user.email}</p>
            </LandingProvider>

            {/* <div className="mt-4">
                {orgs.map((org) => (
                    <Link
                        key={org.orgId}
                        href={`/${org.orgId}`}
                        className="text-primary underline"
                    >
                        <div className="flex items-center">
                            {org.name}
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                    </Link>
                ))}
            </div> */}
        </>
    );
}
