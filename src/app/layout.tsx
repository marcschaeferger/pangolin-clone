import type { Metadata } from "next";
import "./globals.css";
import { Noto_Sans } from "next/font/google";

export const metadata: Metadata = {
    title: "Pangolin",
    description: "",
};

const inter = Noto_Sans({ subsets: ["latin"] });

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html>
            <body className={`${inter.className}`}>
                <main>{children}</main>
            </body>
        </html>
    );
}
