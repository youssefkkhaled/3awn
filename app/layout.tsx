import type { Metadata } from "next";
import { Cairo, Scheherazade_New } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-body",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const scheherazade = Scheherazade_New({
  variable: "--font-title",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "عوّن | وجبات إفطار رمضان",
  description: "منصة تبرع عربية لإدارة وجبات الإفطار اليومية خلال رمضان.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} ${scheherazade.variable}`}>
        {children}
      </body>
    </html>
  );
}
