import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart";

export const metadata: Metadata = {
  title: "Cumbre · Small-batch coffee",
  description: "High-altitude beans, roasted a little at a time and poured the same week.",
};

export const viewport: Viewport = {
  themeColor: "#f2caa7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/big-shoulders-bold.woff" as="font" type="font/woff" crossOrigin="anonymous" />
        <link rel="preload" href="/models/cup.glb" as="fetch" type="model/gltf-binary" crossOrigin="anonymous" />
      </head>
      <body>
        <CartProvider>{children}</CartProvider>
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  );
}
