import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type CopyToClipboardProps = {
    text: string;
    displayText?: string;
    isLink?: boolean;
};

const CopyToClipboard = ({ text, displayText, isLink }: CopyToClipboardProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);

        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };

    const displayValue = displayText ?? text;

    return (
        <div className="flex items-center space-x-2 max-w-full">
            {isLink ? (
                <Link
                    href={text}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:underline"
                    style={{ maxWidth: "100%" }} // Ensures truncation works within parent
                    title={text} // Shows full text on hover
                >
                    {displayValue}
                </Link>
            ) : (
                <span
                    className="truncate"
                    style={{
                        maxWidth: "100%",
                        display: "block",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                    }}
                    title={text} // Full text tooltip
                >
                    {displayValue}
                </span>
            )}
            <button
                type="button"
                className="h-6 w-6 p-0 flex items-center justify-center cursor-pointer"
                onClick={handleCopy}
            >
                {!copied ? (
                    <Copy className="h-4 w-4" />
                ) : (
                    <Check className="text-green-500 h-4 w-4" />
                )}
                <span className="sr-only">Copy text</span>
            </button>
        </div>
    );
};

export default CopyToClipboard;
