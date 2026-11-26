import { useEffect, useState } from 'react'
import type { Cenario, Ctx } from '../Cena'
import { pronto, useContar, useTecla } from '../motor'
import { dur, sfx } from '../som'
import { Balao, Lumi, TopBar, type Pose } from '../ui'

// Cenário 3 "Esperar a vez" (docs/CENARIOS.md): Vez do amigo → Minha vez. A espera fica visível e ocupada.
const CORPO = 'Eu quero balançar agora! Minhas pernas querem correr e minhas mãos querem pegar.'
const AREIA_MS = 8000
const MUSICA = [262, 262, 392, 392, 440, 440, 392] // brilha, brilha, estrelinha
const FIM = 'Ainda tô um pouquinho bravo, mas eu consegui esperar.'

// Ampulheta grande (mesmo desenho de /cena/ampulheta.svg); p = quanto da areia já caiu.
function Ampulheta({ p, onClick }: { p: number; onClick?: () => void }) {
  return (
    <button className={`ampulheta-cena ${onClick ? 'chamando' : ''}`} onClick={onClick} disabled={!onClick} aria-label="Ampulheta">
      <svg viewBox="0 0 200 280"><g stroke="#2C3755" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M44 34C44 90 92 112 94 140C92 168 44 190 44 246H156C156 190 108 168 106 140C108 112 156 90 156 34Z" fill="#DDF0FC" fillOpacity=".6" />
        <path d="M60 58H140C132 86 108 100 100 108C92 100 68 86 60 58Z" fill="#FFC93C" stroke="none" style={{ transformOrigin: '100px 108px', transform: `scaleY(${1 - p})` }} />
        {p > 0 && p < 1 && <path d="M100 118V200" stroke="#E0A51B" strokeWidth="5" strokeDasharray="2 10" fill="none" className="areia" />}
        <path d="M56 240C68 206 132 206 144 240Z" fill="#FFC93C" stroke="none" style={{ transformOrigin: '100px 240px', transform: `scaleY(${p})` }} />
        <path d="M44 34C44 90 92 112 94 140C92 168 44 190 44 246H156C156 190 108 168 106 140C108 112 156 90 156 34Z" fill="none" />
        <rect x="22" y="12" width="156" height="26" rx="11" fill="#E4B27A" /><rect x="22" y="242" width="156" height="26" rx="11" fill="#E4B27A" />
      </g></svg>
    </button>
  )
}

function Palco({ ctx }: { ctx: Ctx }) {
  const { passo, estrategia: est, t } = ctx
  const [corpo, setCorpo] = useState(false)
  const [areia, setAreia] = useState(-1) // -1: ampulheta ainda não virada
  const [notas, setNotas] = useState(0)
  const contar = useContar(() => pronto(ctx, `Pronto! ${FIM}`))
  const fazendo = passo === 'fazer' ? est : undefined

  useEffect(() => {
    if (passo === 'abertura') return ctx.roteiro([0, () => ctx.dizer(t('Olha o balanço! Eu adoro balançar. Toca no balanço!', 'Oi, turma! Olha o balanço! Eu adoro balançar. Vamos lá?'))])
    if (passo === 'sinal') return ctx.roteiro([0, () => {
      sfx.sino()
      ctx.dizer('Ah... agora é a vez do amigo.')
      ctx.seguir(() => (setCorpo(true), ctx.dizer(CORPO), ctx.seguir(() => ctx.ir('emocao'), dur(CORPO) + 600)), 2600)
    }])
    if (passo === 'fazer') return ctx.roteiro([300, () => ctx.dizer({
      ampulheta: t('Vamos olhar a ampulheta? Toca nela pra virar. Quando a areia acabar, é a minha vez.', 'Vamos olhar a ampulheta? Quando a areia acabar, é a minha vez. Quem vira?'),
      apertar: t('Vamos apertar as mãos bem forte e contar até cinco? Toca nos números.', 'Todo mundo apertando as mãos bem forte! Vamos contar até cinco?'),
      cantar: t('Vamos cantar baixinho enquanto espera? Toca nas notas.', 'Vamos cantar baixinho, todo mundo junto?'),
    }[est!]!)])
    if (passo === 'transicao') return ctx.roteiro([300, () => (sfx.toque(), ctx.dizer(t('O amigo terminou. Agora é a minha vez! Toca no balanço.', 'O amigo terminou. Agora é a minha vez! Vamos?')))])
  }, [passo])

  // A areia cai sozinha depois que a criança vira a ampulheta.
  useEffect(() => {
    if (areia < 0 || areia >= 1) return
    const id = setTimeout(() => setAreia((a) => Math.min(1, a + 100 / AREIA_MS)), 100)
    return () => clearTimeout(id)
  }, [areia])
  useEffect(() => void (areia >= 1 && pronto(ctx, `Acabou a areia! ${FIM}`)), [areia >= 1])

  const virar = () => (sfx.vira(), setAreia(0))
  function cantar() {
    if (notas >= MUSICA.length) return
    sfx.nota(MUSICA[notas])
    setNotas(notas + 1)
    if (notas + 1 === MUSICA.length) setTimeout(() => pronto(ctx, `Que música bonita! ${FIM}`), 700)
  }
  const balancar = () => (sfx.toque(), ctx.ir(passo === 'abertura' ? 'sinal' : 'conseguimos'))

  useTecla(ctx, passo === 'abertura' || passo === 'transicao' ? balancar
    : fazendo === 'ampulheta' && areia < 0 ? virar
      : fazendo === 'apertar' ? contar.tocar
        : fazendo === 'cantar' ? cantar : undefined)

  // Anel do "Vez do amigo": enche enquanto a criança faz a estratégia.
  const vez = passo === 'transicao' || passo === 'conseguimos' ? 1
    : fazendo === 'ampulheta' ? Math.max(0, areia) : fazendo === 'apertar' ? contar.n / 5 : fazendo === 'cantar' ? notas / MUSICA.length : 0.1
  const pose: Partial<Record<typeof passo, [Pose, number, number, number]>> = {
    abertura: ['pensando', 90, 250, 430],
    sinal: [corpo ? 'triste_pensativo' : 'pensando', 90, 250, 430],
    fazer: [est === 'ampulheta' ? 'pensando' : est === 'apertar' ? 'respirando' : 'acenando', 90, 250, 430],
    transicao: ['apontando', 90, 250, 430],
  }
  const l = pose[passo]
  const minha = passo === 'transicao'
  const tocavel = passo === 'abertura' || minha
  return (
    <>
      <img className="prop" src="/cena/balanco-estrutura.svg" alt="" style={{ left: 620, top: 230, width: 300 }} />
      <button className={`prop assento ${minha ? '' : 'balanca'} ${tocavel ? 'chamando' : ''}`} style={{ left: 646, top: 270, width: 247 }}
        disabled={!tocavel} onClick={balancar} aria-label="Balanço">
        <img src={minha ? '/cena/balanco-assento.svg' : '/cena/balanco-assento-amigo.svg'} alt="" />
      </button>
      {fazendo !== 'ampulheta' && <img className="prop" src="/cena/ampulheta.svg" alt="" style={{ left: 1040, top: 430, width: 110 }} />}

      {passo === 'fazer' && <div className="veu" />}
      {l && <Lumi pose={l[0]} cor={ctx.cor} x={l[1]} y={l[2]} h={l[3]} />}
      <TopBar agora={minha ? 'minhavez' : 'fila'} depois={minha ? 'fila' : 'minhavez'} progresso={minha ? 1 : vez} alerta={vez >= 1} onCasa={ctx.onCasa} />
      {l && <Balao texto={ctx.fala} x={440} y={132} w={600} />}

      {fazendo === 'ampulheta' && (
        <div className="foco" style={{ left: 980, top: 290 }}><Ampulheta p={Math.max(0, areia)} onClick={areia < 0 ? virar : undefined} /></div>
      )}
      {fazendo === 'apertar' && (
        <>
          <img key={contar.n} className={`foco maos ${contar.n ? 'aperta' : ''}`} src="/ui/estrategia-apertar.svg" alt="" style={{ left: 700, top: 250, width: 170 }} />
          {contar.tela(470, 450)}
        </>
      )}
      {fazendo === 'cantar' && (
        <div className="foco notas" style={{ left: 450, top: 380 }}>
          {MUSICA.map((_, i) => (
            <button key={i} className={`nota-musical ${i < notas ? 'acesa' : ''} ${i === notas ? 'proximo' : ''}`} onClick={cantar} aria-label="Nota">♪</button>
          ))}
        </div>
      )}
    </>
  )
}

export default {
  id: 'esperar', nome: 'Esperar a vez', card: '/ui/cena-esperar.webp',
  emocoes: [['bravo', 'Bravo'], ['triste', 'Triste'], ['calmo', 'Calmo']],
  alvo: 'bravo', sente: 'bravo, porque eu quero muito a minha vez. Esperar é difícil',
  estrategias: [['ampulheta', 'Olhar a ampulheta'], ['apertar', 'Apertar as mãos'], ['cantar', 'Cantar baixinho']],
  pergunta: 'O que pode me ajudar a esperar a minha vez?',
  final: (t) => ({
    a: 'Eba! Esperar foi difícil, mas chegou a minha vez!',
    b: t('E você? O que você faz enquanto espera a sua vez?', 'E vocês? O que vocês fazem enquanto esperam a vez?'),
    c: t('Agora eu vou balançar. Depois é a vez de outro amigo. Tchau!', 'Agora eu vou balançar. Depois é a vez de outro amigo. Tchau, turma!'),
  }),
  Palco,
} satisfies Cenario
