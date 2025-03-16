"use client";

import { cn } from "@app/lib/cn";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useState } from "react";

interface StrategyOption {
    id: string;
    title: string;
    description: string;
    disabled?: boolean; // New optional property
}

interface StrategySelectProps {
    options: StrategyOption[];
    defaultValue?: string;
    onChange?: (value: string) => void;
    cols?: number;
}

export function StrategySelect({
    options,
    defaultValue,
    onChange,
    cols
}: StrategySelectProps) {
    const [selected, setSelected] = useState(defaultValue);

    return (
        <RadioGroup
            defaultValue={defaultValue}
            onValueChange={(value) => {
                setSelected(value);
                onChange?.(value);
            }}
            className={`grid md:grid-cols-${cols ? cols : 1} gap-4`}
        >
            {options.map((option) => (
                <label
                    key={option.id}
                    htmlFor={option.id}
                    data-state={
                        selected === option.id ? "checked" : "unchecked"
                    }
                    className={cn(
                        "relative flex rounded-lg border-2 p-4 transition-colors cursor-pointer",
                        option.disabled
                            ? "border-input text-muted-foreground cursor-not-allowed opacity-50"
                            : selected === option.id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-input hover:bg-accent"
                    )}
                >
                    <RadioGroupItem
                        value={option.id}
                        id={option.id}
                        disabled={option.disabled}
                        className="absolute left-4 top-5 h-4 w-4 border-primary text-primary"
                    />
                    <div className="pl-7">
                        <div className="font-medium">{option.title}</div>
                        <div className="text-sm text-muted-foreground">
                            {option.description}
                        </div>
                    </div>
                </label>
            ))}
        </RadioGroup>
    );
}
