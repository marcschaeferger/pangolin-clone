import * as React from "react";

import { cn } from "@app/lib/cn";
import { EyeOff, Eye } from "lucide-react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        const [showPassword, setShowPassword] = React.useState(false);
        const togglePasswordVisibility = () => setShowPassword(!showPassword);

        return type === "password" ? (
            <div className="relative">
                <input
                    type={showPassword ? "text" : "password"}
                    className={cn(
                        "flex h-9 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-base md:file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                <div className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-gray-400">
                    {showPassword ? (
                        <EyeOff
                            className="h-4 w-4"
                            onClick={togglePasswordVisibility}
                        />
                    ) : (
                        <Eye
                            className="h-4 w-4"
                            onClick={togglePasswordVisibility}
                        />
                    )}
                </div>
            </div>
        ) : (
            <input
                type={type}
                className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-card px-3 py-2 text-base md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-base md:file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
