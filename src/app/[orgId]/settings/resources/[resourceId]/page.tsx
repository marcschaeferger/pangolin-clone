import React from "react";
import { Separator } from "@/components/ui/separator";
import { CreateResourceForm } from "./components/CreateResource";
import { GeneralForm } from "./components/GeneralForm";

export default async function ResourcePage(props: {
    params: Promise<{ resourceId: number | string }>;
}) {
    const params = await props.params;
    const isCreate = params.resourceId === "create";

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">
                    {isCreate ? "Create Resource" : "General"}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {isCreate
                        ? "Create a new resource"
                        : "Edit basic resource settings"}
                </p>
            </div>
            <Separator />

            {isCreate ? <CreateResourceForm /> : <GeneralForm />}
        </div>
    );
}
