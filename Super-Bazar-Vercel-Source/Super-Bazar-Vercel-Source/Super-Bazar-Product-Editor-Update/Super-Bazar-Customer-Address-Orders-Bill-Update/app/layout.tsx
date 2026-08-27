import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Super Bazar — groceries in minutes",
  description: "Fresh groceries, daily essentials, and local favourites delivered fast.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
