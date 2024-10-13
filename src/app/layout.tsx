import type { Metadata } from "next";
import "./globals.css";
import { Roboto } from "next/font/google";

export const metadata: Metadata = {
    title: process.env.NEXT_PUBLIC_APP_NAME,
    description: "",
};

const font = Roboto({ subsets: ["latin"], style: "normal", weight: "400" });

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html>
            <body className={`${font.className}`}>
                <main>{children}</main>
            </body>
        </html>
    );
}
