export default function ButtonLink({
    href,
    children,
    className = ""
}: {
    href: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <a
            href={href}
            className={`rounded-full bg-primary px-4 py-2 text-center font-semibold text-white text-xl no-underline inline-block ${className}`}
        >
            {children}
        </a>
    );
}
