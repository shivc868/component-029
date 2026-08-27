import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import LenisProvider from "./components/LenisProvider";
import "./globals.css";

// warm display serif + clean grotesque body — a classic editorial pairing
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Motion Portfolio",
  description: "Portfolio gallery section",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
