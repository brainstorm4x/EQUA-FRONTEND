import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "EQUA Token - Solana DApp",
  description: "Mint and manage EQUA tokens on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
