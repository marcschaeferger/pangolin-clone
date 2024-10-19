export default async function SetupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <div className="mt-32">{children}</div>;
}
