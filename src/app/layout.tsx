import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Health — Uptime Monitor",
  description: "Monitor your API endpoints and track uptime, response times, and incidents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0b] text-white antialiased">
        <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0a0a0b]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <a href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-white/90 tracking-tight">
                API Health
              </span>
            </a>
            <div className="flex items-center gap-4">
              <a
                href="/status"
                className="text-xs text-white/40 transition-colors hover:text-white/70"
              >
                Status Page
              </a>
              <a
                href="https://github.com/gcasti256"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/30 transition-colors hover:text-white/60"
              >
                by George Castillo
              </a>
            </div>
          </div>
        </nav>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
