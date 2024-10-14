import type { Metadata } from "next";
import "./globals.css";
import { Inter, Roboto } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
    title: process.env.NEXT_PUBLIC_APP_NAME,
    description: "",
};

const font = Inter({ subsets: ["latin"] });

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html>
            <body className={`${font.className} pb-3`}>
                <main>{children}</main>
                <Toaster />
            </body>
        </html>
    );
}
