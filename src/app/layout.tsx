import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flor da Meia-Noite",
  description: "Estrutura inicial do site da Flor da Meia-Noite.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
