import SettingsSectionTitle from "@app/components/SettingsSectionTitle";
import { SidebarSettings } from "@app/components/SidebarSettings";
import { verifySession } from "@app/lib/auth/verifySession";
import UserProvider from "@app/providers/UserProvider";
import { redirect } from "next/navigation";
import { cache } from "react";

type ProfileGeneralProps = {
    children: React.ReactNode;
};

export default async function GeneralSettingsPage({
    children
}: ProfileGeneralProps) {
    const getUser = cache(verifySession);
    const user = await getUser();

    if (!user) {
        redirect(`/?redirect=/profile/general`);
    }

    const sidebarNavItems = [
        {
            title: "Authentication",
            href: `/{orgId}/settings/general`
        }
    ];

    return (
        <>
            <UserProvider user={user}>
                {children}
            </UserProvider>
        </>
    );
}
