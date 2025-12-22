import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Metatron AI",
  description: "Your AI-powered platform",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Prevent page refresh on errors - capture before React loads
            window.addEventListener('error', (event) => {
              console.error('🔴 LAYOUT ERROR:', event.error);
              console.error('🔴 Message:', event.message);
              console.error('🔴 Stack:', event.error?.stack);
              event.preventDefault();
            }, true);
            
            window.addEventListener('unhandledrejection', (event) => {
              console.error('🔴 LAYOUT REJECTION:', event.reason);
              console.error('🔴 Stack:', event.reason?.stack);
              event.preventDefault();
            }, true);
            
            console.log('✅ Global error handlers installed');
          `
        }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
