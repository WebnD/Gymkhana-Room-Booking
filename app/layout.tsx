import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gymkhana Room Booking | IIT Bhubaneswar",
  description:
    "Official SAC Gymkhana Meeting Room Booking Portal — Student Activity Centre, IIT Bhubaneswar",
  icons: {
    icon: "/WebnD.png",
    shortcut: "/WebnD.png",
    apple: "/WebnD.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
