import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChaosKit | Controlled KeeperHub reliability tests",
  description:
    "A controlled reliability lab for testing KeeperHub workflow recovery before value is exposed.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
