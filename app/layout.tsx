import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bala Ji Stock Book",
  description:
    "Inventory and supplier order manager for Bala Ji Namkeen.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=Inter:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
