import { Metadata } from "next";
import { TopbarNav } from "./components/TopbarNav";
import { LayoutGrid, Tent } from "lucide-react";
import Header from "./components/Header";

export const metadata: Metadata = {
    title: "Configuration",
    description: "",
};

const topNavItems = [
    {
        title: "Sites",
        href: "/configuration/sites",
        icon: <Tent />,
    },
    {
        title: "Resources",
        href: "/configuration/resources",
        icon: <LayoutGrid />,
    },
];

interface ConfigurationLaytoutProps {
    children: React.ReactNode;
    params: { siteId: string };
}

export default async function ConfigurationLaytout({
    children,
    params,
}: ConfigurationLaytoutProps) {
    return (
        <>
            <div className="w-full bg-stone-200 border-b border-stone-300 mb-5 select-none px-3">
                <div className="container mx-auto flex flex-col content-between gap-3 pt-2">
                    <Header
                        email="mschwartz10612@gmail.com"
                        orgName="Home Lab 1"
                        name="Milo Schwartz"
                    />
                    <TopbarNav items={topNavItems} />
                </div>
            </div>

            <div className="container mx-auto px-3">{children}</div>
        </>
    );
}
