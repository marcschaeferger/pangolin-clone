import Link from "next/link";

export default async function Page() {
    return (
        <>
           <p>This is where the table goes...</p>
            <Link href="/configuration/sites/123">Open up the site 123</Link>
        </>
    );
}
