import type { Metadata } from "next";
import "./globals.css";
import { Figtree } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@app/providers/ThemeProvider";
import EnvProvider from "@app/providers/EnvProvider";

export const metadata: Metadata = {
    title: `Dashboard - Pangolin`,
    description: ""
};

const font = Figtree({ subsets: ["latin"] });

export default async function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html suppressHydrationWarning>
            <body className={`${font.className}`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <EnvProvider
                        // it's import not to pass all of process.env here in case of secrets
                        // select only the necessary ones
                        env={{
                            NEXT_PORT: process.env.NEXT_PORT as string,
                            SERVER_EXTERNAL_PORT: process.env
                                .SERVER_EXTERNAL_PORT as string,
                            ENVIRONMENT: process.env.ENVIRONMENT as string,
                            EMAIL_ENABLED: process.env.EMAIL_ENABLED as string
                        }}
                    >
                        {children}
                    </EnvProvider>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
