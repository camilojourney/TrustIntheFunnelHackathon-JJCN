import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClaimProof",
  description: "Claim-by-claim evidence reports for recruiters",
};

// System fonts only: the demo must not depend on a network font fetch.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
