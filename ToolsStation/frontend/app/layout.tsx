import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

// Sci-fi friendly fonts
const orbitron = Orbitron({ 
  subsets: ["latin"],
  variable: "--font-orbitron",
});

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AI Daily Feed | Nexus",
  description: "Your daily dose of AI news, papers, and code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={cn(
        "min-h-screen bg-background font-mono antialiased",
        orbitron.variable,
        jetbrainsMono.variable
      )}>
        {children}
      </body>
    </html>
  );
}
