import type { Metadata } from "next";
import "./globals.css";
import { Sidebar, MobileNav } from "@/components/navigation";
import DBInitializer from "@/components/db-initializer";
import AuthGuard from "@/components/auth-guard";

export const metadata: Metadata = {
  title: "灵思 VoiceMind — 用声音捕捉灵感",
  description: "AI 驱动的语音笔记应用，录音自动转录、智能摘要、知识沉淀",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthGuard>
          <DBInitializer />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-h-screen pb-20 lg:pb-0">
              {children}
            </main>
          </div>
          <MobileNav />
        </AuthGuard>
      </body>
    </html>
  );
}
