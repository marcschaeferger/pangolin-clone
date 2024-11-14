import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatAxiosError(error: any, defaultMessage?: string): string {
    return (
        error.response?.data?.message ||
        error?.message ||
        defaultMessage ||
        "An error occurred"
    );
}
