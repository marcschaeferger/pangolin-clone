"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export default function CopyTextBox({ text = "", wrapText = false }) {
    const [isCopied, setIsCopied] = useState(false);
    const textRef = useRef<HTMLPreElement>(null);

    const copyToClipboard = async () => {
        if (textRef.current) {
            try {
                await navigator.clipboard.writeText(
                    textRef.current.textContent || ""
                );
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                console.error("Failed to copy text: ", err);
            }
        }
    };

    return (
        <div className="relative w-full border rounded-md">
            <pre
                ref={textRef}
                className={`p-4 pr-16 text-sm w-full ${
                    wrapText
                        ? "whitespace-pre-wrap break-words"
                        : "overflow-x-auto"
                }`}
            >
                <code className="block w-full">{text}</code>
            </pre>
            <Button
                variant="outline"
                size="icon"
                type="button"
                className="absolute top-1 right-1 z-10"
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
