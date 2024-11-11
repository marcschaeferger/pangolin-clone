"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface CustomDomainInputProps {
    domainSuffix: string;
    placeholder?: string;
    onChange?: (value: string) => void;
}

export default function CustomDomainInput(
    {
        domainSuffix,
        placeholder = "Enter subdomain",
        onChange,
    }: CustomDomainInputProps = {
        domainSuffix: ".example.com",
    }
) {
    const [value, setValue] = React.useState("");

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setValue(newValue);
        if (onChange) {
            onChange(newValue);
        }
    };

    return (
        <div className="w-full">
            <div className="flex">
                <Input
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                    className="rounded-r-none flex-grow"
                />
                <div className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-muted-foreground">
                    <span className="text-sm">{domainSuffix}</span>
                </div>
            </div>
        </div>
    );
}
