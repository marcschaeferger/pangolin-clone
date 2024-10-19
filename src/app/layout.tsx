import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@app/providers/ThemeProvider";
import { ListOrgsResponse } from "@server/routers/org";
import { internal } from "@app/api";
import { AxiosResponse } from "axios";
import { authCookieHeader } from "@app/api/cookies";
import { redirect } from "next/navigation";

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
    let orgs: ListOrgsResponse["orgs"] = [];
    try {
        const res = await internal.get<AxiosResponse<ListOrgsResponse>>(
            `/orgs`,
            authCookieHeader(),
        );
        if (res && res.data.data.orgs) {
            orgs = res.data.data.orgs;
        }

        if (!orgs.length) {
            redirect(`/setup`);
        }
    } catch (e) {
        console.error("Error fetching orgs", e);
    }

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
