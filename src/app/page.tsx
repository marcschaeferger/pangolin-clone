import { internal } from "@app/api";
import { authCookieHeader } from "@app/api/cookies";
import { verifySession } from "@app/lib/auth/verifySession";
import UserProvider from "@app/providers/UserProvider";
import { ListOrgsResponse } from "@server/routers/org";
import { AxiosResponse } from "axios";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache } from "react";

export const dynamic = "force-dynamic";

export default async function Page(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await props.searchParams; // this is needed to prevent static optimization
    const getUser = cache(verifySession);
    const user = await getUser();

    if (!user) {
        redirect("/auth/login");
    }

    let orgs: ListOrgsResponse["orgs"] = [];
    try {
        const res = await internal.get<AxiosResponse<ListOrgsResponse>>(
            `/orgs`,
            await authCookieHeader()
        );

        if (res && res.data.data.orgs) {
            orgs = res.data.data.orgs;
        }
    } catch (e) {
        console.error(e);
    }

    if (!orgs.length) {
        redirect("/setup");
    }

    return (
        <>
            <UserProvider user={user}>
                <p>Logged in as {user.email}</p>
            </UserProvider>

            <div className="mt-4">
                {orgs.map((org) => (
                    <Link
                        key={org.orgId}
                        href={`/${org.orgId}/settings`}
                        className="text-primary underline"
                    >
                        <div className="flex items-center">
                            {org.name}
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}
