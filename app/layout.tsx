import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voxel Editor",
  description: "A sparse-map voxel editor built with Three.js and Next.js."
};

/** Provides the app-wide HTML shell and global styling wrapper. */
export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
