"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

type CopyTextBoxProps = {
    text?: string;
    displayText?: string;
    wrapText?: boolean;
    outline?: boolean;
};

export default function CopyTextBox({
    text = "",
    displayText,
    wrapText = false,
    outline = true
}: CopyTextBoxProps) {
    const [isCopied, setIsCopied] = useState(false);
    const textRef = useRef<HTMLPreElement>(null);

    const copyToClipboard = async () => {
        if (textRef.current) {
            try {
                await navigator.clipboard.writeText(text);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                console.error("Failed to copy text: ", err);
            }
        }
    };

    return (
        <div
            className={`relative w-full border rounded-md ${!outline ? "bg-muted" : "bg-card"}`}
        >
            <pre
                ref={textRef}
                className={`p-2 pr-16 text-sm w-full ${
                    wrapText
                        ? "whitespace-pre-wrap break-words"
                        : "overflow-x-auto"
                }`}
            >
                <code className="block w-full">{displayText || text}</code>
            </pre>
            <Button
                variant="ghost"
                size="sm"
                type="button"
                className="absolute top-0.5 right-0 z-10 bg-card"
                onClick={copyToClipboard}
                aria-label="Copy to clipboard"
            >
                {isCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                ) : (
                    <Copy className="h-4 w-4" />
                )}
            </Button>
        </div>
    );
}
