import type { Metadata } from "next";
import "./globals.css";
import { Figtree, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@app/providers/ThemeProvider";
import EnvProvider from "@app/providers/EnvProvider";
import { Separator } from "@app/components/ui/separator";
import { pullEnv } from "@app/lib/pullEnv";
import { BookOpenText, ExternalLink } from "lucide-react";
import Image from "next/image";
import SupportStatusProvider from "@app/providers/SupporterStatusProvider";
import { createApiClient, internal, priv } from "@app/lib/api";
import { AxiosResponse } from "axios";
import { IsSupporterKeyVisibleResponse } from "@server/routers/supporterKey";
import SupporterMessage from "./components/SupporterMessage";

export const metadata: Metadata = {
    title: `Dashboard - Pangolin`,
    description: ""
};

export const dynamic = "force-dynamic";

// const font = Figtree({ subsets: ["latin"] });
const font = Inter({ subsets: ["latin"] });

export default async function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    const env = pullEnv();

    let supporterData = {
        visible: true
    } as any;

    const res = await priv.get<AxiosResponse<IsSupporterKeyVisibleResponse>>(
        "supporter-key/visible"
    );
    supporterData.visible = res.data.data.visible;
    supporterData.tier = res.data.data.tier;

    return (
        <html suppressHydrationWarning>
            <body className={`${font.className} min-h-screen flex flex-col`}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <EnvProvider env={pullEnv()}>
                        <SupportStatusProvider supporterStatus={supporterData}>
                            {/* Main content */}
                            <div className="flex flex-col min-h-screen">
                                <div className="flex-1">
                                    {children}
                                </div>
                            </div>
                        </SupportStatusProvider>
                    </EnvProvider>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
