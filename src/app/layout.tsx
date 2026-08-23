import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { ConsoleShell } from "@/components/ConsoleShell";
import { FloatingTerminalButton } from "@/components/FloatingTerminalButton";
import "./globals.css";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-data",
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Aura — AYUSH OPD case-taking",
  description:
    "Voice and touch patient intake, Dashavidha, OCR review, practitioner-approved care. Never auto-diagnostic.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <ConsoleShell>{children}</ConsoleShell>
        </Providers>
        <FloatingTerminalButton />
      </body>
    </html>
  );
}

