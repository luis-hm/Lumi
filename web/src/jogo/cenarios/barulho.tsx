import { useEffect, useState } from 'react'
import { doMotor, type Cenario, type Ctx } from '../Cena'
import { AvisoLeve, LumiAbafador, pronto, useAnel, useTecla } from '../motor'
import { dur, sfx } from '../som'
import { Balao, Lumi, TopBar, type Pose } from '../ui'

// Cenário 4 "Barulho demais" (docs/CENARIOS.md): Festa → Parabéns → pausa → Festa.
// O barulho aparece no medidor, nunca tocado alto: o cenário é para crianças sensíveis a som.
const CORPO = 'Meus ouvidos estão doendo. Eu quero tapar os ouvidos.'
const FIM = 'Ainda tô um pouquinho preocupado, mas já tô melhor.'
const BALOES = [['vermelho', 1010, 250, 96], ['amarelo', 1090, 220, 90], ['azul', 150, 200, 84]] as const

function Palco({ ctx }: { ctx: Ctx }) {
  const { passo, estrategia: est, t } = ctx
  const [nivel, setNivel] = useState(2) // medidor de barulho, 0–5
  const [corpo, setCorpo] = useState(false)
  const [abafador, setAbafador] = useState(false)
  const [pediu, setPediu] = useState(false)
  const [cantinho, setCantinho] = useState(false)
  const [pulou, setPulou] = useState(-1)
  const anel = useAnel(ctx, 'Daqui a pouquinho vão cantar parabéns. Vai ficar bem barulhento.')
  const fazendo = passo === 'fazer' ? est : undefined

  useEffect(() => {
    if (passo === 'abertura') return ctx.roteiro([0, () => ctx.dizer(t('Que festa! Toca nos balões!', 'Oi, turma! Hoje tem festa! Olha os balões!'))])
    if (passo === 'sinal') return ctx.roteiro([0, () => {
      setNivel(5)
      sfx.palmas()
      ctx.dizer('Ai! Tá muito barulho!')
      ctx.seguir(() => (setCorpo(true), ctx.dizer(CORPO), ctx.seguir(() => ctx.ir('emocao'), dur(CORPO) + 600)), 2600)
    }])
    if (passo === 'fazer') return ctx.roteiro([300, () => ctx.dizer({
      ouvidos: t('Vamos tapar os ouvidos? Toca no abafador.', 'Vamos tapar os ouvidos? Todo mundo põe as mãos nos ouvidos!'),
      pausa: t('Vamos mostrar o cartão de pausa pra professora? Toca no cartão.', 'Vamos mostrar o cartão de pausa pra professora?'),
      cantinho: t('Vamos pro cantinho calmo? Toca na cabana.', 'Vamos pro cantinho calmo? Quem me leva?'),
    }[est!]!)])
    if (passo === 'transicao') return ctx.roteiro([300, () => (setCantinho(false), setNivel(2), ctx.dizer(t('Pronto, eu tô melhor. Vamos voltar pra festa? Toca num balão!', 'Pronto, eu tô melhor. Vamos voltar pra festa?')))])
  }, [passo])

  function tapar() {
    sfx.toque()
    setAbafador(true)
    setNivel(2)
    pronto(ctx, `Ufa! Agora o barulho ficou baixinho. ${FIM}`)
  }
  // Comunicação funcional: o Lumi pede a pausa e a professora responde (no teatro, ela mesma pode responder).
  function pedirPausa() {
    sfx.toque()
    setPediu(true)
    ctx.dizer('Professora, eu preciso de uma pausa.')
    ctx.seguir(() => (ctx.dizer('Pode ir, Lumi. O cantinho tá te esperando.'), ctx.seguir(irCantinho, 3200)), 2800)
  }
  function irCantinho() {
    sfx.respira(false)
    setCantinho(true)
    setNivel(1)
    pronto(ctx, `Aqui no cantinho tá quietinho. ${FIM}`)
  }
  function tocarBalao(i: number) {
    sfx.nota([523, 659, 784][i])
    setPulou(i)
    if (passo === 'transicao') ctx.ir('conseguimos')
  }

  useTecla(ctx, passo === 'abertura' ? anel.avancar
    : fazendo === 'ouvidos' && !abafador ? tapar
      : fazendo === 'pausa' && !pediu ? pedirPausa
        : fazendo === 'cantinho' && !cantinho ? irCantinho
          : passo === 'transicao' ? () => tocarBalao(0) : undefined)

  const pose: Partial<Record<typeof passo, [Pose, number, number, number]>> = {
    abertura: ['comemorando', 330, 330, 340],
    sinal: [corpo ? 'triste_sentando' : 'triste_pensativo', 300, corpo ? 370 : 300, corpo ? 300 : 370],
    fazer: cantinho ? ['respirando', 1010, 420, 220] : est === 'pausa' ? ['apontando', 200, 230, 440] : ['respirando', 170, 180, 480],
    transicao: ['acenando', 330, 250, 430],
  }
  const l = pose[passo]
  const festa = !(passo === 'fazer' && (est === 'pausa' || est === 'cantinho'))
  const pausando = passo === 'fazer' || passo === 'transicao'
  return (
    <>
      <img className="prop" src="/cena/bandeirinhas.svg" alt="" style={{ left: 0, top: 104, width: 1280 }} />
      {festa && BALOES.map(([c, x, y, w], i) => (
        <button key={c} className={`prop balao-festa ${pulou === i ? 'pulou' : ''} ${passo === 'transicao' ? 'chamando' : ''}`} style={{ left: x, top: y, width: w }}
          disabled={passo !== 'abertura' && passo !== 'transicao'} onClick={() => tocarBalao(i)} onAnimationEnd={() => setPulou(-1)} aria-label="Balão">
          <img src={`/cena/balao-${c}.svg`} alt="" />
        </button>
      ))}
      {!festa && (
        <button className={`prop ${fazendo === 'cantinho' && !cantinho ? 'chamando' : ''}`} style={{ left: 930, top: 330, width: 300 }}
          disabled={fazendo !== 'cantinho' || cantinho} onClick={irCantinho} aria-label="Cantinho calmo">
          <img src="/cena/cabana.svg" alt="" style={{ width: '100%' }} />
        </button>
      )}
      {!doMotor(passo) && <div className="medidor" style={{ left: 40, top: 300 }} aria-label={`Barulho ${nivel} de 5`}>
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" /><path fill="none" strokeLinecap="round" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>
        {[5, 4, 3, 2, 1].map((n) => <span key={n} className={`n${n} ${n <= nivel ? 'on' : ''}`} />)}
      </div>}
      {passo === 'sinal' && (
        <svg className="prop ondas" viewBox="0 0 400 220" style={{ left: 250, top: 300, width: 400 }} fill="none" stroke="#6A3FB5" strokeWidth="7" strokeLinecap="round">
          <path d="M70 120q-24 30 0 60M44 100q-40 50 0 100M330 120q24 30 0 60M356 100q40 50 0 100" /><path d="M120 60l14-26M200 40V10M280 60l-14-26" stroke="#F0776B" />
        </svg>
      )}

      {l && (fazendo === 'ouvidos'
        ? <LumiAbafador cor={ctx.cor} x={l[1]} y={l[2]} h={l[3]} abafador={abafador} />
        : <Lumi pose={l[0]} cor={ctx.cor} x={l[1]} y={l[2]} h={l[3]} />)}
      <TopBar agora={!pausando ? (passo === 'abertura' ? 'festa' : 'parabens') : festa ? 'parabens' : 'cantinho'} depois={passo === 'abertura' ? 'parabens' : 'festa'}
        progresso={passo === 'abertura' ? anel.p : 1} alerta={(anel.leve && passo === 'abertura') || passo === 'transicao'} onCasa={ctx.onCasa} />
      {passo === 'abertura' && anel.leve && <AvisoLeve />}
      {l && <Balao texto={ctx.fala} x={cantinho ? 360 : fazendo ? 600 : 430} y={passo === 'abertura' && anel.leve ? 200 : 170} w={cantinho ? 560 : fazendo ? 520 : 600} />}

      {fazendo === 'ouvidos' && !abafador && (
        <button className="foco chamando" style={{ left: 720, top: 360, width: 240 }} onClick={tapar} aria-label="Abafador">
          <img src="/cena/abafador.svg" alt="" style={{ width: '100%' }} />
        </button>
      )}
      {fazendo === 'pausa' && !cantinho && (
        <button className={`foco cartao-pausa ${pediu ? 'mostrando' : 'chamando'}`} style={{ left: 640, top: 330, width: 220 }} disabled={pediu} onClick={pedirPausa} aria-label="Cartão de pausa">
          <img src="/ui/estrategia-pausa.svg" alt="" style={{ width: '100%' }} />
        </button>
      )}
    </>
  )
}

export default {
  id: 'barulho', nome: 'Barulho demais', card: '/ui/cena-barulho.svg',
  emocoes: [['preocupado', 'Preocupado'], ['bravo', 'Bravo'], ['triste', 'Triste']],
  alvo: 'preocupado', sente: 'preocupado, porque o barulho tá forte demais pra mim',
  estrategias: [['ouvidos', 'Tapar os ouvidos'], ['pausa', 'Pedir uma pausa'], ['cantinho', 'Ir pro cantinho']],
  pergunta: 'O que pode me ajudar quando tem barulho demais?',
  final: (t) => ({
    a: 'Conseguimos! Eu cuidei do meu ouvido e voltei pra festa.',
    b: t('E você? O que você faz quando tem barulho demais?', 'E vocês? O que vocês fazem quando tem barulho demais?'),
    c: t('Agora eu vou brincar com os balões. Tchau!', 'Agora eu vou brincar com os balões. Tchau, turma!'),
  }),
  Palco,
} satisfies Cenario
