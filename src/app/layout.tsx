import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SieReach Meta for Facebook - Inactive Lead Recovery & Blast Automation",
  description:
    "Multi-page Facebook Messenger Inactive Lead Detection & Automated Re-engagement Platform for Business Pages - SieReach Meta",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('sielab_reach_theme');
                if (saved === 'light' || saved === 'dark') {
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(saved);
                  document.documentElement.setAttribute('data-theme', saved);
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
