import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GoogleOAuthProviderWrapper from "@/components/GoogleOAuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loop - AI-Powered Calendar Intelligence",
  description: "Transform your calendar from a scheduling tool into a personalized life assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        <GoogleOAuthProviderWrapper>
          {children}
        </GoogleOAuthProviderWrapper>
      </body>
    </html>
  );
}
