import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import NavigationHeader from '@/components/NavigationHeader'

export const metadata: Metadata = {
  title: 'Portyfoul - Portfolio Manager',
  description: 'Stock and crypto portfolio manager',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NavigationHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
