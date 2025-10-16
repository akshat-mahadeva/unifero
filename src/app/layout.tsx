import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unifero",
  description: "Next Gen Web Search Chatbot",
  icons: {
    icon: "/unifero.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: [dark],
        variables: { colorPrimary: "blue" },
        signIn: {
          baseTheme: [dark],
          variables: { colorPrimary: "pink" },
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistMono.variable} ${manrope.variable} antialiased font-sans`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              {children}
              <Toaster style={{}} />
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
