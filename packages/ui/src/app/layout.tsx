import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ContractLoader } from "@/components/contract-loader";

export const metadata: Metadata = {
    title: "JurisGenie — Deterministic Legal Contract Engine",
    description: "Upload, annotate, evaluate, execute, and anchor legal contracts with cryptographic integrity.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className="dark">
            <body className="antialiased grid-bg">
                <Providers>
                    <ContractLoader />
                    <div className="flex min-h-screen">
                        <Sidebar />
                        <div className="flex-1 flex flex-col min-w-0">
                            <Topbar />
                            <main className="flex-1 p-6 overflow-y-auto">
                                {children}
                            </main>
                        </div>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
