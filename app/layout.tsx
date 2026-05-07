import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SubscribeModal from "@/components/ui/SubscribeModal";
import ConsoleEgg from "@/components/ui/ConsoleEgg";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
  weight: ["400", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Hondius Watch — Hantavirus outbreak tracker",
    template: "%s | Hondius Watch",
  },
  description:
    "Live tactical readout: hantavirus outbreak aboard MV Hondius. Cases, deaths, ship route, contact-tracing.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://hondius-watch.com"
  ),
  openGraph: {
    siteName: "Hondius Watch",
    type: "website",
    locale: "en_US",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          defer
          data-domain="YOUR_DOMAIN"
          src="https://plausible.io/js/script.js"
        />
      </head>
      <body className="bg-color-bg text-color-text antialiased">
        {children}
        <SubscribeModal />
        <ConsoleEgg />
      </body>
    </html>
  );
}
