import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClaimProof · Candidate evidence notebook",
  description: "Add context and evidence to three claims from your application.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
