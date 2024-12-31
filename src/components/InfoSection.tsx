"use client";

export function InfoSections({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 md:gap-4 gap-2 md:grid-cols-[1fr_auto_1fr] md:items-start">
            {children}
        </div>
    );
}

export function InfoSection({ children }: { children: React.ReactNode }) {
    return <div className="space-y-1">{children}</div>;
}

export function InfoSectionTitle({ children }: { children: React.ReactNode }) {
    return <div className="font-semibold">{children}</div>;
}

export function InfoSectionContent({
    children
}: {
    children: React.ReactNode;
}) {
    return <div className="break-words">{children}</div>;
}

export function Divider() {
    return (
        <div className="hidden md:block border-l border-gray-300 h-auto mx-4"></div>
    );
}
