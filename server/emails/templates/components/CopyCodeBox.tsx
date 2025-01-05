import React from "react";

export default function CopyCodeBox({ text }: { text: string }) {
    return (
        <div className="flex items-center justify-center rounded-lg bg-neutral-100 p-2">
            <span className="text-2xl font-mono text-neutral-600 tracking-wide">
                {text}
            </span>
        </div>
    );
}
