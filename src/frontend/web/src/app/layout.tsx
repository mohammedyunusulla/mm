import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mandi Manager - Digital Record Book",
  description: "Digitise your Mandi records - track purchases, sales, expenses & more",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
