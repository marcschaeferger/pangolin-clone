import ProfileIcon from "@app/components/ProfileIcon";
import { verifySession } from "@app/lib/auth/verifySession";
import UserProvider from "@app/providers/UserProvider";
import { Metadata } from "next";
import { cache } from "react";

export const metadata: Metadata = {
    title: `Auth - Pangolin`,
    description: ""
};

type AuthLayoutProps = {
    children: React.ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
    const getUser = cache(verifySession);
    const user = await getUser();

    return (
        <div className="h-full flex flex-col">
            {user && (
                <UserProvider user={user}>
                    <div className="p-3 ml-auto">
                        <ProfileIcon />
                    </div>
                </UserProvider>
            )}

            <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-md p-3">
                    {children}
                </div>
            </div>
        </div>
    );
}
