import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { OnlineStatus } from "@/components/pwa/OnlineStatus";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#1db954",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Fitness Life RPG",
    template: "%s | Fitness Life RPG",
  },
  description: "Transforme seus treinos em aventura. App RPG local-first para fitness.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitnessRPG",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "FitnessRPG",
    "msapplication-TileColor": "#121212",
    "msapplication-tap-highlight": "no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        {children}
        <OnlineStatus />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
