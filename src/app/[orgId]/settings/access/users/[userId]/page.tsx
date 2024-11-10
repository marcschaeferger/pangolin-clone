import React from "react";
import { Separator } from "@/components/ui/separator";

export default async function UserPage(props: {
    params: Promise<{ niceId: string }>;
}) {
    const params = await props.params;

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Manage User</h3>
                <p className="text-sm text-muted-foreground">
                    Manage user access and permissions
                </p>
            </div>
            <Separator />
        </div>
    );
}
