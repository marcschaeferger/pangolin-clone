"use client";

import { cn } from "@app/lib/cn";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

interface StrategyOption {
    id: string;
    title: string;
    description: string;
}

interface StrategySelectProps {
    options: StrategyOption[];
    defaultValue?: string;
    onChange?: (value: string) => void;
}

export function StrategySelect({
    options,
    defaultValue,
    onChange
}: StrategySelectProps) {
    return (
        <RadioGroup
            defaultValue={defaultValue}
            onValueChange={onChange}
            className="grid gap-4"
        >
            {options.map((option) => (
                <label
                    key={option.id}
                    htmlFor={option.id}
                    className={cn(
                        "relative flex cursor-pointer rounded-lg border-2 p-4",
                        "data-[state=checked]:border-primary data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                    )}
                >
                    <RadioGroupItem
                        value={option.id}
                        id={option.id}
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
