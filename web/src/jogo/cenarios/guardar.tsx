import { useEffect, useState, type CSSProperties } from 'react'
import type { Cenario, Ctx } from '../Cena'
import { AvisoForte, AvisoLeve, pronto, useAnel, useContar, useRespirar, useTecla } from '../motor'
import { dur, falar, sfx } from '../som'
import { Balao, Lumi, TopBar, type Pose } from '../ui'

// Cenário 1 "Parar o que eu gosto" (docs/CENARIOS.md): Brincar → Roda, com a caixa do depois.
type Onde = 'chao' | 'caixa' | number // number = altura na torre
const CORES_BLOCO = ['#F26B6B', '#FFC93C', '#6CC17A', '#4A86E8', '#A77BE0']
const CHAO = [[240, 615], [310, 688], [850, 672], [960, 612], [1010, 690]]
const TORRE_X = 690, TORRE_Y = 676, BLOCO = 62
const CORPO = 'Ah... minha barriga ficou apertada. Eu queria brincar mais.'

function Palco({ ctx }: { ctx: Ctx }) {
  const { passo, estrategia: est, t } = ctx
  const [blocos, setBlocos] = useState<Onde[]>(['chao', 'chao', 'chao', 'chao', 'chao'])
  const [triste, setTriste] = useState(false)
  const anel = useAnel(ctx, 'Daqui a pouquinho vai ser hora de guardar os brinquedos.')
  const respirar = useRespirar(ctx, () => pronto(ctx, 'Ufa! Ainda tô um pouquinho triste, mas agora eu consigo.'))
  const contar = useContar(() => pronto(ctx, 'Pronto! Ainda tô um pouquinho triste, mas agora eu consigo.'))
  const guardando = passo === 'transicao' || (passo === 'fazer' && est === 'tchau')

  useEffect(() => {
    if (passo === 'abertura') return ctx.roteiro([0, () => ctx.dizer(t('Vamos brincar? Toca nos blocos pra gente fazer uma torre!', 'Oi, turma! Vamos brincar? Quem me ajuda a fazer uma torre?'))])
    if (passo === 'sinal') return ctx.roteiro([0, () => {
      sfx.sino()
      ctx.dizer('Hora de guardar os brinquedos!')
      ctx.seguir(() => (setTriste(true), ctx.dizer(CORPO), ctx.seguir(() => ctx.ir('emocao'), dur(CORPO) + 600)), 2800)
    }])
    if (passo === 'fazer') return ctx.roteiro([300, () => ctx.dizer({
      respirar: t('Vamos respirar juntos? Toca no balão.', 'Vamos respirar todo mundo junto?'),
      contar: t('Vamos contar juntos até cinco? Toca nos números.', 'Vamos contar juntos até cinco? Mostra nos dedinhos!'),
      tchau: t('Vamos dar tchau pros blocos? Toca em cada um.', 'Vamos dar tchau pros blocos? Todo mundo dando tchau!'),
    }[est!]!)])
    if (passo === 'transicao') return ctx.roteiro([300, () => ctx.dizer(t('Vamos guardar na caixa do depois? Os blocos vão me esperar. Toca neles!', 'Vamos guardar na caixa do depois? Os blocos vão me esperar. Me ajudem!'))])
  }, [passo])

  function tocarBloco(i: number) {
    const b = blocos[i]
    if (passo === 'abertura') {
      sfx.bloco()
      if (typeof b === 'number') return (setBlocos(blocos.map(() => 'chao')), ctx.dizer('Cabum! De novo!'))
      const altura = blocos.filter((x) => typeof x === 'number').length
      setBlocos(blocos.map((x, j) => (j === i ? altura : x)))
      if (altura === 4) ctx.dizer('Uau! Que torre alta!')
      return
    }
    if (!guardando || b === 'caixa') return
    sfx.bloco()
    const novo = blocos.map((x, j) => (j === i ? 'caixa' : x))
    setBlocos(novo)
    if (est === 'tchau') falar('Tchau!')
    if (novo.every((x) => x === 'caixa')) ctx.seguir(() => ctx.ir('conseguimos'), 900)
  }

  useTecla(ctx, passo === 'abertura' ? anel.avancar
    : passo === 'fazer' && est === 'respirar' ? respirar.tocar
      : passo === 'fazer' && est === 'contar' ? contar.tocar
        : () => tocarBloco(blocos.findIndex((b) => b !== 'caixa')))

  const pose: Partial<Record<typeof passo, [Pose, number, number, number]>> = {
    abertura: ['brincando', 362, 405, 290],
    sinal: [triste ? 'triste_sentando' : 'brincando', 362, 405, 290],
    fazer: est === 'respirar' ? ['respirando', 170, 180, 480] : est === 'contar' ? ['apontando', 60, 200, 460] : ['acenando', 330, 190, 470],
    transicao: ['apontando', 330, 200, 460],
  }
  const l = pose[passo]
  const depois = passo !== 'abertura'
  return (
    <>
      {blocos.map((b, i) => {
        const [x, y] = b === 'chao' ? CHAO[i] : b === 'caixa' ? [1160, 345] : [TORRE_X, TORRE_Y - 56 * b]
        const ativo = passo === 'abertura' || (guardando && b !== 'caixa')
        return (
          <button key={i} aria-label="bloco" className={`bloco ${b === 'caixa' ? 'na-caixa' : ''} ${ativo && guardando ? 'chamando' : ''}`}
            style={{ left: x - BLOCO / 2, top: y - BLOCO / 2, zIndex: typeof b === 'number' ? 10 + b : 5, '--c': CORES_BLOCO[i] } as CSSProperties}
            disabled={!ativo} onClick={() => tocarBloco(i)} />
        )
      })}
      {passo === 'fazer' && est !== 'tchau' && <div className="veu" />}
      {l && <Lumi pose={l[0]} cor={ctx.cor} x={l[1]} y={l[2]} h={l[3]} />}
      <TopBar agora={depois ? 'guardar' : 'brincar'} depois={depois ? 'roda' : 'guardar'} progresso={depois ? 1 : anel.p} alerta={anel.leve && !depois} onCasa={ctx.onCasa} />
      {passo === 'abertura' && anel.leve && <AvisoLeve />}
      {passo === 'sinal' && <AvisoForte icone="guardar" texto="Hora de guardar os brinquedos!" />}
      {(passo === 'abertura' || (passo === 'sinal' && triste)) && <Balao texto={ctx.fala} x={560} y={300} w={420} />}
      {passo === 'fazer' && est !== 'tchau' && <Balao texto={ctx.fala} x={est === 'respirar' ? 600 : 470} y={150} w={520} />}
      {guardando && <Balao texto={ctx.fala} x={600} y={150} w={460} />}
      {passo === 'fazer' && est === 'respirar' && respirar.tela(640, 320)}
      {passo === 'fazer' && est === 'contar' && contar.tela(470, 360)}
    </>
  )
}

export default {
  id: 'guardar', nome: 'Parar o que eu gosto', card: '/ui/cena-guardar.webp',
  emocoes: [['feliz', 'Feliz'], ['triste', 'Triste'], ['bravo', 'Bravo']],
  alvo: 'triste', sente: 'triste porque queria continuar brincando',
  estrategias: [['respirar', 'Respirar 3 vezes'], ['contar', 'Contar até 5'], ['tchau', 'Dar tchau']],
  pergunta: 'O que pode me ajudar a ficar mais calmo?',
  final: (t) => ({
    a: 'Conseguimos! Os blocos estão na caixa do depois, esperando por mim.',
    b: t('E você? O que você faz quando precisa parar de brincar?', 'E vocês? O que vocês fazem quando precisam parar de brincar?'),
    c: t('Agora é hora da roda. Depois eu brinco de novo. Tchau!', 'Agora é hora da roda. E vocês, vão guardar os brinquedos? Tchau, turma!'),
  }),
  Palco,
} satisfies Cenario
