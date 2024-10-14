import Link from "next/link";

export default async function Page() {
    return (
        <>
            <div className="space-y-0.5 select-none">
                <h2 className="text-2xl font-bold tracking-tight">
                    Manage Sites
                </h2>
                <p className="text-muted-foreground">
                    Manage your existing sites here or create a new one.
                </p>
            </div>
        </>
    );
}
