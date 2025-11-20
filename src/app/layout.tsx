import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";

export const metadata: Metadata = {
  title: "EQUA Token - Decentralized Token Platform",
  description: "Mint and manage EQUA tokens on Solana blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
