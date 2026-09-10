import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { AppFrame } from "@/components/AppFrame";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Plus One Promo Admin",
    template: "%s | Plus One Promo Admin",
  },
  description: "Manage catalog products and order requests",
  icons: {
    icon: [
      { url: "/favicon.ico?v=circle", sizes: "any" },
      { url: "/favicon.png?v=circle", sizes: "32x32", type: "image/png" },
      { url: "/icon-512.png?v=circle", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=circle", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AuthProvider>
          <AppFrame>{children}</AppFrame>
        </AuthProvider>
      </body>
    </html>
  );
}
