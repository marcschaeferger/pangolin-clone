import type { Metadata } from "next";
import "./globals.css";
import { Inter, Open_Sans, Roboto } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@app/providers/ThemeProvider";

export const metadata: Metadata = {
    title: process.env.NEXT_PUBLIC_APP_NAME,
    description: "",
};

const font = Inter({ subsets: ["latin"] });
// const font = Open_Sans({ subsets: ["latin"] });

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html suppressHydrationWarning>
            <body className={`${font.className} pb-3`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
