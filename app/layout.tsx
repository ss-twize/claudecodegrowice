import type { Metadata } from "next";
import { Unbounded, Montserrat } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-unbounded",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GROWICE — Главная панель",
  description: "Платформа управления салоном красоты",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${unbounded.variable} ${montserrat.variable} font-montserrat bg-[#0A0D14] text-[#EDF2FA] antialiased`}>
          <Sidebar />
          <main className="ml-60 min-h-screen">
            {children}
          </main>
      </body>
    </html>
  );
}
