import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-context";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Alotth.com",
  description: "",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} antialiased overflow-consistent`}>
        <ThemeProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 overflow-consistent">{children}</main>
          </div>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
