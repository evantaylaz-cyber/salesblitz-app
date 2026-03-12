import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Blitz | AI-Powered Sales Prep & Practice",
  description:
    "Research, rehearse & close. Get deep research, POV decks, speaker notes & live AI practice for every deal on your calendar. Delivered in minutes.",
  metadataBase: new URL("https://salesblitz.ai"),
  openGraph: {
    title: "Sales Blitz | Research. Rehearse. Close.",
    description:
      "AI-powered research, POV decks, speaker notes & live practice for every deal on your calendar.",
    url: "https://salesblitz.ai",
    siteName: "Sales Blitz",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sales Blitz | Research. Rehearse. Close.",
    description:
      "AI-powered research, POV decks, speaker notes & live practice for every deal on your calendar.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-[#0a0a0a] text-gray-100 antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
