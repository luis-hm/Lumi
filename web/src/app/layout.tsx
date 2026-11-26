import type { Metadata } from 'next'
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lumi e as Emoções',
  description: 'Jogo educativo sobre regulação emocional em transições da rotina (3 a 6 anos).',
  icons: '/lumi/cor-azul.webp',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
