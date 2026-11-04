import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoopCycle | Smart waste management",
  description: "Report waste, request collection, and track your local impact."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
