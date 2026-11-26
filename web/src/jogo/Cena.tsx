import { useEffect, useRef, useState, type FC } from 'react'
import { alternarVoz, dur, estaMudo, falar, falarDeNovo, sfx } from './som'
import { Balao, Icone, Lumi, type Cor } from './ui'

// Motor da cena (doc §3.1, docs/CENARIOS.md): abertura → sinal → emoção → estratégia → fazer junto → transição → conseguimos.
// O motor cuida do que é igual em todo cenário (emoção, estratégia, final, teatro, voz). O resto é o Palco de cada cenário.
// Nenhum passo tem erro: toda escolha leva ao mesmo final positivo (RF10, R-IHC09).
export type Passo = 'abertura' | 'sinal' | 'emocao' | 'estrategia' | 'fazer' | 'transicao' | 'conseguimos'
type Opcao = readonly [string, string]
export type Final = { a: string; b: string; c: string }

export type Ctx = {
  passo: Passo; estrategia?: string; teatro: boolean; cor: Cor; fala: string
  dizer: (t: string) => void
  t: (crianca: string, turma: string) => string // fala para uma criança (jogo) ou para a turma (teatro)
  seguir: (acao: () => void, ms: number) => void // avança a história: no jogo depois de ms; no teatro quando a professora apertar
  roteiro: (...r: [number, () => void][]) => () => void
  ir: (p: Passo) => void
  acao: { current?: () => void } // teatro: o que a tecla faz quando a cena não está esperando (tocar no que está "chamando")
  final: { current?: Final } // o Palco pode trocar as falas do final (ex.: a brincadeira escolhida)
  onCasa: () => void
}

export type Cenario = {
  id: string; nome: string; card: string
  emocoes: readonly Opcao[]; alvo: string; sente: string // o que o Lumi diz que sente depois da escolha da criança
  estrategias: readonly Opcao[]; pergunta: string
  final: (t: Ctx['t']) => Final
  Palco: FC<{ ctx: Ctx }>
}

// Passos que o motor desenha (Lumi, véu e balão); nos outros quem desenha é o Palco.
export const doMotor = (p: Passo) => p === 'emocao' || p === 'estrategia' || p === 'conseguimos'

// teatro: a professora conduz a cena projetada. Nada avança sozinho; espaço/→/PageDown (o passador de slides) avança,
// ←/PageUp ou R repete a fala, 1–3 escolhe, V liga/desliga a voz, Esc sai.
export default function Cena({ cen, cor, teatro, onSair, onConcluir }: {
  cen: Cenario; cor: Cor; teatro: boolean; onSair: () => void; onConcluir: () => void
}) {
  const [passo, setPasso] = useState<Passo>('abertura')
  const [fala, setFala] = useState('')
  const [emocao, setEmocao] = useState<string>()
  const [estrategia, setEstrategia] = useState<string>()
  const [destaque, setDestaque] = useState(-1) // opção que o Lumi está lendo em voz alta
  const [tchau, setTchau] = useState(false)
  const [proximo, setProximo] = useState<() => void>()
  const [mudo, setMudo] = useState(estaMudo)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const acao = useRef<() => void>(undefined)
  const final = useRef<Final>(undefined)
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const dizer = (t: string) => (setFala(t), falar(t))
  const t = (crianca: string, turma: string) => (teatro ? turma : crianca)
  const seguir = (f: () => void, ms: number) => {
    if (teatro) setProximo(() => f)
    else timers.current.push(setTimeout(f, ms))
  }
  // Executa um roteiro [ms, ação] quando o passo começa; o cleanup cancela (inclusive no StrictMode).
  const roteiro = (...r: [number, () => void][]) => {
    const ts = r.map(([ms, f]) => setTimeout(f, ms))
    return () => ts.forEach(clearTimeout)
  }
  const ctx: Ctx = { passo, estrategia, teatro, cor, fala, dizer, t, seguir, roteiro, ir: setPasso, acao, final, onCasa: onSair }

  // A criança não lê: o Lumi faz a pergunta e depois lê cada opção, destacando a que está falando.
  const apresentar = (pergunta: string, opcoes: readonly Opcao[]) => {
    let ms = 300 + dur(pergunta)
    const leituras = opcoes.map(([, nome], i): [number, () => void] => {
      const em = ms
      ms += dur(nome) + 300
      return [em, () => (setDestaque(i), falar(nome, false))]
    })
    return roteiro([300, () => dizer(pergunta)], ...leituras, [ms, () => setDestaque(-1)])
  }

  // Encerramento: comemora, devolve a pergunta para a criança (espaço pro adulto conversar),
  // se despede e o jogo termina de verdade. O jogo também é uma atividade que acaba.
  const encerrar = () => {
    const { a, b, c } = final.current ?? cen.final(t)
    return roteiro([200, () => {
      sfx.festa()
      onConcluir()
      dizer(a)
      seguir(() => {
        dizer(b)
        // no jogo, pausa fixa pra conversa; no teatro, a roda de conversa dura o que a professora quiser
        seguir(() => (setTchau(true), dizer(c), seguir(onSair, dur(c) + 1200)), dur(b) + 8000)
      }, dur(a) + 400)
    }])
  }

  useEffect(() => {
    if (passo === 'emocao' && !emocao) return apresentar(t('Como você acha que eu estou me sentindo?', 'Como vocês acham que eu estou me sentindo?'), cen.emocoes)
    if (passo === 'estrategia' && !estrategia) return apresentar(cen.pergunta, cen.estrategias)
    if (passo === 'conseguimos') return encerrar()
    // emocao/estrategia nas deps: escolher cancela a leitura das opções que ainda faltavam.
  }, [passo, emocao, estrategia])

  function escolherEmocao(id: string, nome: string) {
    if (emocao) return
    sfx.toque()
    setEmocao(id)
    setDestaque(-1)
    // Acolhe e nomeia, nunca corrige: o Lumi diz o que ele sente (vocabulário emocional).
    const resposta = id === cen.alvo
      ? `${nome}! ${t('Você percebeu', 'Vocês perceberam')}. Eu tô ${cen.sente}.`
      : `${nome}... obrigado por me ajudar! Eu acho que tô ${cen.sente}.`
    dizer(resposta)
    seguir(() => setPasso('estrategia'), dur(resposta) + 500)
  }

  function escolherEstrategia(id: string, nome: string) {
    if (estrategia) return
    sfx.toque()
    setEstrategia(id)
    setDestaque(-1)
    dizer(`${nome}. Boa ideia!`)
    seguir(() => setPasso('fazer'), 1800)
  }

  // --- teatro: controle pelo teclado / passador de slides
  function avancar() {
    if (proximo) return (setProximo(undefined), proximo())
    acao.current?.()
  }
  useEffect(() => {
    if (!teatro) return
    const tecla = (e: KeyboardEvent) => {
      const k = e.key
      const n = /^[1-9]$/.test(k) ? +k - 1 : -1
      if ([' ', 'Enter', 'ArrowRight', 'PageDown'].includes(k)) avancar()
      else if (['ArrowLeft', 'PageUp', 'r', 'R'].includes(k)) falarDeNovo()
      else if (k === 'v' || k === 'V') setMudo(alternarVoz())
      else if (k === 'Escape') onSair()
      else if (passo === 'emocao' && cen.emocoes[n]) escolherEmocao(cen.emocoes[n][0], cen.emocoes[n][1])
      else if (passo === 'estrategia' && cen.estrategias[n]) escolherEstrategia(cen.estrategias[n][0], cen.estrategias[n][1])
      else return
      e.preventDefault() // senão espaço/Enter também "clica" no botão que estiver em foco
    }
    addEventListener('keydown', tecla)
    return () => removeEventListener('keydown', tecla)
  }) // sem deps: re-registra a cada render para enxergar o estado atual

  const Palco = cen.Palco
  return (
    <div className={`tela ${teatro ? 'teatro' : ''}`} style={{ backgroundImage: 'url(/bg/sala-azul.jpg)' }}>
      <Palco ctx={ctx} />

      {doMotor(passo) && <div className="veu" />}
      {passo === 'emocao' && <Lumi pose="triste_pensativo" cor={cor} x={70} y={190} h={470} />}
      {passo === 'estrategia' && <Lumi pose="pensando" cor={cor} x={70} y={190} h={470} />}
      {passo === 'conseguimos' && <Lumi pose={tchau ? 'acenando' : 'comemorando'} cor={cor} x={90} y={160} h={500} className={tchau ? '' : 'pulo'} />}
      {(passo === 'emocao' || passo === 'estrategia') && <Balao texto={fala} x={470} y={150} w={620} />}

      {passo === 'emocao' && (
        <div className="painel escolhas" style={{ left: 520, top: 330, width: 620 }}>
          {cen.emocoes.map(([id, nome], i) => (
            <button key={id} className={`opcao emocao ${emocao === id ? 'escolhida' : ''} ${emocao && id === cen.alvo ? 'lumi-sente' : ''} ${destaque === i ? 'destaque' : ''}`}
              disabled={!!emocao && emocao !== id} onClick={() => escolherEmocao(id, nome)}>
              <img src={`/ui/emocao-${id}.webp`} alt="" /><span>{nome}</span>
            </button>
          ))}
        </div>
      )}

      {passo === 'estrategia' && (
        <div className="painel escolhas" style={{ left: 470, top: 300, width: 740 }}>
          {cen.estrategias.map(([id, nome], i) => (
            <button key={id} className={`opcao estrategia ${estrategia === id ? 'escolhida' : ''} ${destaque === i ? 'destaque' : ''}`}
              disabled={!!estrategia && estrategia !== id} onClick={() => escolherEstrategia(id, nome)}>
              <img src={cartaoEstrategia(id)} alt="" /><span>{nome}</span>
            </button>
          ))}
        </div>
      )}

      {passo === 'conseguimos' && (
        <div className="painel final" style={{ left: 600, top: 130, width: 620 }}>
          <h1 className="titulo">Conseguimos!</h1>
          <div className="arco">
            <figure><img src={`/ui/emocao-${cen.alvo}.webp`} alt="" /><figcaption>Antes</figcaption></figure>
            <span className="arco-seta"><Icone nome="seta" /></span>
            <figure><img src="/ui/emocao-calmo.webp" alt="" /><figcaption>Agora</figcaption></figure>
            <figure className="adesivo"><img src={cen.card} alt="" /><figcaption>Novo adesivo!</figcaption></figure>
          </div>
        </div>
      )}
      {/* a pergunta final também fica escrita: é o roteiro de conversa para o adulto */}
      {passo === 'conseguimos' && <Balao texto={fala} x={600} y={560} w={620} />}

      {/* HUD discreto pra professora: a cena está parada esperando ela avançar / a voz está desligada */}
      {teatro && (
        <div className="teatro-hud">
          {mudo && <span>voz desligada (V)</span>}
          {(proximo || passo === 'abertura') && <span className="seguir"><Icone nome="seta" /></span>}
        </div>
      )}
    </div>
  )
}

// Os 3 cards do cenário 1 são da equipe (webp); os novos foram desenhados em SVG no mesmo estilo (canvas Doop).
export const cartaoEstrategia = (id: string) => `/ui/estrategia-${id}.${['respirar', 'contar', 'tchau'].includes(id) ? 'webp' : 'svg'}`
