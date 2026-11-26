import type { CSSProperties, ReactNode } from 'react'
import { falarDeNovo, sfx } from './som'

export type Cor = 'azul' | 'vermelho' | 'verde' | 'amarelo'
export type Pose = 'acenando' | 'brincando' | 'comemorando' | 'respirando' | 'triste_pensativo' | 'triste_sentando' | 'apontando' | 'pensando'
export const POSES: Pose[] = ['acenando', 'brincando', 'comemorando', 'respirando', 'triste_pensativo', 'triste_sentando', 'apontando', 'pensando']
// Cada pose existe nas 4 cores (tools/assets.py recolore só o azul do Lumi).
export const arquivoLumi = (pose: Pose, cor: Cor) => `/lumi/${pose}${cor === 'azul' ? '' : '-' + cor}.webp`

// Lumi em posição absoluta no palco 1280×720.
export function Lumi({ pose, cor, x, y, h, className = '' }: { pose: Pose; cor: Cor; x: number; y: number; h: number; className?: string }) {
  return <img className={`lumi ${className}`} src={arquivoLumi(pose, cor)} alt="Lumi" style={{ left: x, top: y, height: h }} draggable={false} />
}

// Balão de fala: legenda do que a voz diz (o adulto lê, a criança ouve).
export function Balao({ texto, x, y, w = 460, cauda = 'esquerda' }: { texto: string; x: number; y: number; w?: number; cauda?: 'esquerda' | 'baixo' }) {
  if (!texto) return null
  return <div key={texto} className={`balao cauda-${cauda}`} style={{ left: x, top: y, width: w }}>{texto}</div>
}

export function Botao({ children, onClick, tom = 'principal', style }: { children: ReactNode; onClick: () => void; tom?: 'principal' | 'secundario' | 'sol'; style?: CSSProperties }) {
  return <button className={`botao botao-${tom}`} style={style} onClick={() => (sfx.toque(), onClick())}>{children}</button>
}

export type Atividade = 'brincar' | 'guardar' | 'roda' | 'parque' | 'massinha' | 'desenhar' | 'mudou' | 'fila' | 'minhavez' | 'festa' | 'parabens' | 'cantinho' | 'casa'
export const NOME: Record<Atividade, string> = {
  brincar: 'Brincar', guardar: 'Guardar', roda: 'Roda', parque: 'Parque', massinha: 'Massinha', desenhar: 'Desenhar', mudou: 'Mudou!',
  fila: 'Vez do amigo', minhavez: 'Minha vez', festa: 'Festa', parabens: 'Parabéns', cantinho: 'Cantinho', casa: 'Casa',
}

// Rotina visual: Agora → Depois. O anel do "Agora" enche com o tempo: é o aviso antecipado (a criança vê o fim chegando).
export function TopBar({ agora, depois, progresso, alerta, onCasa }: { agora: Atividade; depois: Atividade; progresso?: number; alerta?: boolean; onCasa: () => void }) {
  return (
    <div className="topbar">
      <button className="redondo" aria-label="Início" onClick={() => (sfx.toque(), onCasa())}><Icone nome="casa" /></button>
      <div className="rotina">
        <div className="chip chip-agora" style={{ '--p': progresso ?? 1 } as CSSProperties}>
          <span className="chip-icone"><Icone nome={agora} /></span>
          <span><small>Agora</small>{NOME[agora]}</span>
        </div>
        <Icone nome="seta" />
        <div className={`chip chip-depois ${alerta ? 'alerta' : ''} ${depois === 'mudou' ? 'mudou' : ''}`}>
          <span className="chip-icone"><Icone nome={depois} /></span>
          <span><small>Depois</small>{NOME[depois]}</span>
        </div>
      </div>
      <button className="redondo" aria-label="Ouvir de novo" onClick={falarDeNovo}><Icone nome="som" /></button>
    </div>
  )
}

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
// Os ícones de atividade são os mesmos do componente ActivityChip do canvas Doop (página Cenários TEA/TDAH).
export function Icone({ nome }: { nome: 'casa' | 'som' | 'seta' | 'estrela' | 'repetir' | 'play' | 'pincel' | Atividade }) {
  const d: Record<string, ReactNode> = {
    casa: <path {...P} d="M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5" />,
    som: <><path {...P} fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z" /><path {...P} d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></>,
    seta: <path {...P} strokeWidth={3} d="m9 5 7 7-7 7" />,
    estrela: <path fill="currentColor" stroke="#2C3755" strokeWidth={1.6} strokeLinejoin="round" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" />,
    repetir: <path {...P} strokeWidth={3} d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5" />,
    play: <path fill="currentColor" d="M8 5.5v13l10.5-6.5z" />,
    pincel: <><circle {...P} cx="12" cy="12" r="8.5" /><circle cx="8.5" cy="10" r="1.6" fill="#F26B6B" /><circle cx="12" cy="7.6" r="1.6" fill="#FFC93C" /><circle cx="15.5" cy="10" r="1.6" fill="#6CC17A" /><circle cx="14" cy="14.5" r="1.6" fill="#4A86E8" /></>,
    brincar: <><rect {...P} x="4" y="13" width="7" height="7" rx="1" /><rect {...P} x="13" y="13" width="7" height="7" rx="1" /><path {...P} d="m12 4 4 6H8z" /></>,
    guardar: <><rect {...P} x="3.5" y="5" width="17" height="4.5" rx="1" /><path {...P} d="M5 9.5V19h14V9.5M10 13h4" /></>,
    parque: <><circle {...P} cx="12" cy="9" r="6" /><path {...P} d="M12 15v6" /></>,
    massinha: <><circle {...P} cx="7.5" cy="16" r="4" /><circle {...P} cx="16.5" cy="16" r="4" /><circle {...P} cx="12" cy="8" r="4" /></>,
    desenhar: <><path {...P} d="M4 20l1.2-4.2L16 5l3 3L8.2 18.8z" /><path {...P} d="M14 7l3 3" /></>,
    mudou: <path {...P} d="M4.5 10A8 8 0 0 1 18.5 7M19 3.5V7.5H15M19.5 14A8 8 0 0 1 5.5 17M5 20.5V16.5H9" />,
    fila: <><circle {...P} cx="8" cy="7" r="3" /><circle {...P} cx="16.5" cy="7" r="3" /><path {...P} d="M3 20c0-4 2-6 5-6s5 2 5 6M11.5 20c0-4 2-6 5-6s5 2 5 6" /></>,
    minhavez: <><circle {...P} cx="11" cy="7" r="3" /><path {...P} d="M5 20c0-4 2.5-6 6-6s6 2 6 6" /><path fill="currentColor" d="m19 2.5.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" /></>,
    festa: <><ellipse {...P} cx="12" cy="9" rx="5.5" ry="6.5" /><path {...P} d="M11 15.5h2l-1 1.2zM12 16.7c-1 1.5 1 3 0 4.8" /></>,
    parabens: <><rect {...P} x="4" y="12" width="16" height="8.5" rx="2" /><path {...P} d="M4 15.5c2.7 1.6 5.3 1.6 8 0s5.3-1.6 8 0M12 12V8.5M12 4c1.2 1.2 1.2 2.6 0 3.2-1.2-.6-1.2-2 0-3.2z" /></>,
    cantinho: <path {...P} d="M3 20.5 12 4l9 16.5zM12 11.5 8.8 20.5h6.4z" />,
    roda: <><circle {...P} cx="12" cy="12" r="6.5" strokeDasharray="2 3.1" /><circle cx="12" cy="4" r="2" fill="currentColor" /><circle cx="20" cy="12" r="2" fill="currentColor" /><circle cx="12" cy="20" r="2" fill="currentColor" /><circle cx="4" cy="12" r="2" fill="currentColor" /></>,
  }
  return <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden>{d[nome]}</svg>
}
