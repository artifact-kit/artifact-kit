import './styles.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'DeckKit Workbench',
  description: 'Human-in-the-loop workbench for DeckKit reconstruction workflows.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
