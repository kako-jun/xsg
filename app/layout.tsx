import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XSG - Signal Generator",
  description:
    "Professional test pattern generator for display calibration and testing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
