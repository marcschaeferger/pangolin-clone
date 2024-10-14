import React from "react";
import { Separator } from "@/components/ui/separator";
import { ProfileForm } from "@app/components/profile-form";
import { CreateSiteForm } from "./components/create-site";

export default function SettingsProfilePage({
    params,
}: {
    params: { siteId: string };
}) {
    const isCreateForm = params.siteId === "create";

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">
                    {isCreateForm ? "Create Site" : "Profile"}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {isCreateForm
                        ? "Create a new site for your profile."
                        : "This is how others will see you on the site."}
                </p>
            </div>
            <Separator />

            {isCreateForm ? <CreateSiteForm /> : <ProfileForm />}
        </div>
    );
}
