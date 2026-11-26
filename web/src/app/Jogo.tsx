'use client'
import dynamic from 'next/dynamic'

// O jogo usa voz, áudio e localStorage: só existe no navegador, então não pré-renderiza no servidor.
const App = dynamic(() => import('@/jogo/App'), { ssr: false })
export default function Jogo() {
  return <App />
}
