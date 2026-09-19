import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sage",
  description: "Claim-by-claim evidence reports for recruiters",
};

// Runs while the browser parses the HTML, before the first paint, so a saved
// dark choice never arrives as a white flash. A saved choice wins over the
// operating system setting. The print route stays light, so it is skipped.
const THEME_SCRIPT = `(function(){try{var p=location.pathname;if(p.charAt(p.length-1)==="/")p=p.slice(0,-1);if(p.slice(-6)==="/print")return;var s=localStorage.getItem("sage-theme");document.documentElement.classList.toggle("dark",s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches)}catch(e){}})();`;

// System fonts only: the demo must not depend on a network font fetch.
// suppressHydrationWarning: the script above edits <html> before React runs.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
