import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto, Roboto_Mono } from "next/font/google";
import "@/styles/globals.css";
import { ThemeProvider } from "next-themes";
import { AppProvider } from "@/stores/AppStore";
import CsrfFetchPatch from "@/components/CsrfFetchPatch";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dineflow",
  description:
    "Restaurant management application built with Next.js and Tailwind CSS",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${roboto.className} ${robotoMono.className} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body>
        <CsrfFetchPatch />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AppProvider>
            <main className="flex-1 p-4">{children}</main>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
