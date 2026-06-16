import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Debate Arena",
  description: "Watch two AIs argue in real-time. Who wins?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
