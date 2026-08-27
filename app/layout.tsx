import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import LenisProvider from "./components/LenisProvider";
import "./globals.css";

// modern characterful grotesque for display + clean Manrope body
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
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
      className={`${bricolage.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
