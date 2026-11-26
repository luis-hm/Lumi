import { useEffect, useState } from 'react'
import type { Cenario, Ctx } from '../Cena'
import { AvisoLeve, pronto, useAnel, useRespirar, useTecla } from '../motor'
import { dur, falar, sfx } from '../som'
import { Balao, Icone, Lumi, NOME, TopBar, type Atividade, type Pose } from '../ui'

// Cenário 2 "Mudou o plano" (docs/CENARIOS.md): Roda → Parque, mas choveu. O cartão de mudança entra na agenda.
type Plano = 'parque' | 'mudou' | 'massinha' | 'desenhar'
const FUNDO: Record<string, string> = { roda: '#e3f1fb', parque: '#e2f5df', mudou: 'var(--sol)', casa: '#fde3ec', massinha: '#f1e6ff', desenhar: '#ffe9d6' }
const HORA = { massinha: 'da massinha', desenhar: 'de desenhar' }
const CORPO = 'Meu coração ficou batendo rápido. Eu não sei o que vai acontecer agora.'

function Cartao({ a, className = '', onClick }: { a: Atividade; className?: string; onClick?: () => void }) {
  return (
    <button className={`cartao ${className}`} onClick={onClick} disabled={!onClick}>
      <span className="ic" style={{ background: FUNDO[a] }}><Icone nome={a} /></span><b>{NOME[a]}</b>
    </button>
  )
}

function Palco({ ctx }: { ctx: Ctx }) {
  const { passo, estrategia: est, t } = ctx
  const [plano, setPlano] = useState<Plano>('parque')
  const [chuva, setChuva] = useState(false)
  const [corpo, setCorpo] = useState(false)
  const anel = useAnel(ctx, 'Daqui a pouquinho a roda acaba e a gente vai pro parque!')
  const respirar = useRespirar(ctx, () => pronto(ctx, 'Ufa! Ainda tô um pouquinho preocupado, mas agora eu consigo.'))
  const novo = plano === 'desenhar' ? 'desenhar' : 'massinha' // depois de respirar, a professora já trocou o cartão

  useEffect(() => {
    if (passo === 'abertura') return ctx.roteiro([0, () => ctx.dizer(t('Olha a agenda de hoje! Primeiro roda, depois parque, depois casa. Toca nos cartões!', 'Oi, turma! Olha a agenda de hoje: primeiro roda, depois parque, depois casa.'))])
    if (passo === 'sinal') return ctx.roteiro([0, () => {
      setChuva(true)
      sfx.chuva()
      ctx.dizer('Ih... começou a chover.')
      ctx.seguir(() => {
        sfx.vira()
        setPlano('mudou')
        ctx.dizer('Hoje não vai ter parque.')
        ctx.seguir(() => (setCorpo(true), ctx.dizer(CORPO), ctx.seguir(() => ctx.ir('emocao'), dur(CORPO) + 600)), 2600)
      }, 2600)
    }])
    if (passo === 'fazer') return ctx.roteiro([300, () => ctx.dizer({
      agenda: t('Vamos olhar a agenda de novo? Toca no cartão que mudou.', 'Vamos olhar a agenda de novo? Quem me mostra o cartão que mudou?'),
      planob: t('Vamos escolher outra brincadeira aqui na sala? Massinha ou desenhar?', 'Vamos escolher outra brincadeira aqui na sala? Massinha ou desenhar? Vocês escolhem!'),
      respirar: t('Vamos respirar juntos? Toca no balão.', 'Vamos respirar todo mundo junto?'),
    }[est!]!)])
    if (passo === 'transicao') return ctx.roteiro([300, () => {
      if (plano === 'mudou') (sfx.vira(), setPlano('massinha'))
      ctx.dizer(t(`No lugar do parque, ${NOME[novo].toLowerCase()} na sala! Toca no cartão pra gente ir.`, `No lugar do parque, ${NOME[novo].toLowerCase()} na sala! Vamos?`))
    }])
  }, [passo])

  function olharAgenda() { // estratégia "olhar a agenda": o cartão de mudança mostra o que vem no lugar
    sfx.vira()
    setPlano('massinha')
    pronto(ctx, 'Olha: no lugar do parque, massinha na sala! Agora eu sei o que vai acontecer.')
  }
  function escolher(a: 'massinha' | 'desenhar') {
    sfx.toque()
    setPlano(a)
    pronto(ctx, `${NOME[a]}! Boa escolha. O parque fica pra outro dia.`)
  }
  function ir() {
    sfx.toque()
    ctx.final.current = { ...cenario.final(t), c: `Agora é hora ${HORA[novo]}. O parque fica pra outro dia. Tchau!` }
    ctx.ir('conseguimos')
  }

  const fazendo = passo === 'fazer' ? est : undefined
  useTecla(ctx, passo === 'abertura' ? anel.avancar
    : fazendo === 'agenda' && plano === 'mudou' ? olharAgenda
      : fazendo === 'planob' && plano === 'mudou' ? () => escolher('massinha')
        : fazendo === 'respirar' ? respirar.tocar
          : passo === 'transicao' ? ir : undefined)

  const pose: Partial<Record<typeof passo, [Pose, number, number, number]>> = {
    abertura: ['acenando', 60, 250, 430],
    sinal: [corpo ? 'triste_pensativo' : 'pensando', 60, 250, 430],
    fazer: est === 'respirar' ? ['respirando', 170, 180, 480] : [est === 'agenda' ? 'apontando' : 'pensando', 60, 250, 430],
    transicao: ['apontando', 60, 250, 430],
  }
  const l = pose[passo]
  const depois: Atividade = plano === 'parque' ? 'parque' : plano === 'mudou' ? 'mudou' : plano
  const ler = (a: Atividade) => () => (sfx.toque(), falar(NOME[a]))
  return (
    <>
      {chuva && <img className="prop" src="/cena/chuva.svg" alt="" style={{ left: 1046, top: 0, width: 234 }} />}
      {l && <Lumi pose={l[0]} cor={ctx.cor} x={l[1]} y={l[2]} h={l[3]} />}
      <TopBar agora="roda" depois={depois} progresso={passo === 'abertura' ? anel.p : 1} alerta={(anel.leve && passo === 'abertura') || plano === 'mudou' || passo === 'transicao'} onCasa={ctx.onCasa} />
      {passo === 'abertura' && anel.leve && <AvisoLeve />}

      {l && fazendo !== 'respirar' && (
        <div className="agenda" style={{ left: 430, top: 330 }}>
          <span className="agenda-tit">{fazendo === 'planob' && plano === 'mudou' ? 'Outra brincadeira' : 'Agenda de hoje'}</span>
          {fazendo === 'planob' && plano === 'mudou' ? (
            <div className="cartoes">
              <Cartao a="massinha" className="chamando" onClick={() => escolher('massinha')} />
              <Cartao a="desenhar" className="chamando" onClick={() => escolher('desenhar')} />
            </div>
          ) : (
            <div className="cartoes">
              <Cartao a="roda" className="agora" onClick={passo === 'abertura' ? ler('roda') : undefined} />
              {plano === 'mudou' ? (
                <div className="cartao-pilha">
                  <Cartao a="parque" className="saindo" />
                  <Cartao a="mudou" className={`mudou ${fazendo === 'agenda' ? 'chamando' : ''}`} onClick={fazendo === 'agenda' ? olharAgenda : undefined} />
                </div>
              ) : (
                <Cartao a={depois} className={plano !== 'parque' ? `novo ${passo === 'transicao' ? 'chamando' : ''}` : ''}
                  onClick={passo === 'abertura' ? ler(depois) : passo === 'transicao' ? ir : undefined} />
              )}
              <Cartao a="casa" onClick={passo === 'abertura' ? ler('casa') : undefined} />
            </div>
          )}
        </div>
      )}

      {l && <Balao texto={ctx.fala} x={fazendo === 'respirar' ? 600 : 430} y={passo === 'abertura' && anel.leve ? 195 : 140} w={fazendo === 'respirar' ? 520 : 560} />}
      {fazendo === 'respirar' && respirar.tela(640, 320)}
    </>
  )
}

const cenario = {
  id: 'mudou', nome: 'Mudou o plano', card: '/ui/cena-mudou.svg',
  emocoes: [['preocupado', 'Preocupado'], ['bravo', 'Bravo'], ['feliz', 'Feliz']],
  alvo: 'preocupado', sente: 'preocupado, porque o plano mudou',
  estrategias: [['agenda', 'Olhar a agenda'], ['planob', 'Outra brincadeira'], ['respirar', 'Respirar 3 vezes']],
  pergunta: 'O que pode me ajudar quando o plano muda?',
  final: (t) => ({
    a: 'Conseguimos! O plano mudou e deu tudo certo.',
    b: t('E você? O que você faz quando o plano muda?', 'E vocês? O que vocês fazem quando o plano muda?'),
    c: 'Agora é hora da massinha. O parque fica pra outro dia. Tchau!',
  }),
  Palco,
} satisfies Cenario
export default cenario
