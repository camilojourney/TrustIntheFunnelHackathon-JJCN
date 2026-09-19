import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClaimProof · Candidate evidence notebook",
  description: "A personalized voice interview with Sage, grounded in your application.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
