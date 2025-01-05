import React from "react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";

interface SwitchComponentProps {
    id: string;
    label: string;
    description?: string;
    defaultChecked?: boolean;
    onCheckedChange: (checked: boolean) => void;
}

export function SwitchInput({
    id,
    label,
    description,
    defaultChecked = false,
    onCheckedChange
}: SwitchComponentProps) {
    return (
        <div>
            <div className="flex items-center space-x-2 mb-2">
                <Switch
                    id={id}
                    defaultChecked={defaultChecked}
                    onCheckedChange={onCheckedChange}
                />
                <Label htmlFor={id}>{label}</Label>
            </div>
            {description && (
                <span className="text-muted-foreground text-sm">
                    {description}
                </span>
            )}
        </div>
    );
}
