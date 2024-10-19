import React from "react";
import { Separator } from "@/components/ui/separator";
import { CreateSiteForm } from "./components/CreateSite";
import { GeneralForm } from "./components/GeneralForm";

export default function SettingsPage({
    params,
}: {
    params: { niceId: string };
}) {
    const isCreate = params.niceId === "create";

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">
                    {isCreate ? "Create Site" : "General"}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {isCreate
                        ? "Create a new site"
                        : "Edit basic site settings"}
                </p>
            </div>
            <Separator />

            {isCreate ? <CreateSiteForm /> : <GeneralForm />}
        </div>
    );
}
