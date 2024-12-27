import ProfileIcon from "@app/components/ProfileIcon";
import { verifySession } from "@app/lib/auth/verifySession";
import UserProvider from "@app/providers/UserProvider";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";

export const metadata: Metadata = {
    title: `Setup - Pangolin`,
    description: ""
};

export const dynamic = "force-dynamic";

export default async function SetupLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const getUser = cache(verifySession);
    const user = await getUser();

    if (!user) {
        redirect("/?redirect=/setup");
    }

    if (
        !(process.env.DISABLE_USER_CREATE_ORG === "false" || user.serverAdmin)
    ) {
        redirect("/");
    }

    return (
        <>
            <div className="p-3">
                {user && (
                    <UserProvider user={user}>
                        <div>
                            <ProfileIcon />
                        </div>
                    </UserProvider>
                )}

                <div className="w-full max-w-2xl mx-auto md:mt-32 mt-4">
                    {children}
                </div>
            </div>
        </>
    );
}
