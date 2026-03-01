import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "AltVest | Sales Intelligence Platform",
  description: "AI-powered tools for interview prep, prospecting, and deal management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
