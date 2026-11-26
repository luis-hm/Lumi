import { useEffect, useState } from 'react'
import type { Ctx } from './Cena'
import { dur, falar, sfx } from './som'
import { Icone, Lumi, type Atividade, type Cor } from './ui'

// Peças que mais de um cenário usa.
const ABERTURA_MS = 20000 // ponytail: tempo fixo pra demo; o doc fala em cenas de 3–5 min no total
const ENCHER_TEATRO_MS = 3000 // no teatro o anel só enche quando a professora avança (metade por vez)

// Anel do "Agora" (aviso antecipado): na metade vem o aviso leve com sino; cheio, vem o sinal.
export function useAnel(ctx: Ctx, avisoLeve: string) {
  const [p, setP] = useState(0)
  const [teto, setTeto] = useState(ctx.teatro ? 0 : 1)
  const [leve, setLeve] = useState(false)
  useEffect(() => {
    if (ctx.passo !== 'abertura') return
    const id = setInterval(() => setP((x) => Math.min(teto, x + 100 / (ctx.teatro ? ENCHER_TEATRO_MS : ABERTURA_MS))), 100)
    return () => clearInterval(id)
  }, [ctx.passo, teto])
  useEffect(() => {
    if (ctx.passo !== 'abertura') return
    if (p >= 0.5 && !leve) (setLeve(true), sfx.sino(), ctx.dizer(avisoLeve))
    if (p >= 1) ctx.ir('sinal')
  }, [p, ctx.passo, leve])
  return { p, leve, avancar: () => p >= teto && setTeto((x) => Math.min(1, x + 0.5)) }
}

// Respirar 3 vezes com o balão (o balão enche e esvazia no ritmo da respiração).
export function useRespirar(ctx: Ctx, aoTerminar: () => void) {
  const [r, setR] = useState({ feitas: 0, fase: 'parado' as 'parado' | 'puxa' | 'solta' })
  function tocar() {
    if (r.fase !== 'parado' || r.feitas >= 3) return
    sfx.respira(true)
    setR({ ...r, fase: 'puxa' })
    ctx.dizer('Puxa o ar...')
    setTimeout(() => (sfx.respira(false), setR((x) => ({ ...x, fase: 'solta' })), ctx.dizer('Solta devagar...')), 3500)
    setTimeout(() => {
      const feitas = r.feitas + 1
      setR({ feitas, fase: 'parado' })
      if (feitas === 3) aoTerminar()
      else falar(feitas === 1 ? 'Mais uma vez!' : 'Só mais uma!')
    }, 7000)
  }
  const tela = (x: number, y: number) => (
    <div className="respirar" style={{ left: x, top: y }}>
      <button className={`balao-ar ${r.fase}`} onClick={tocar} aria-label="Respirar">
        {r.fase === 'parado' ? ctx.t('Toca', 'Vamos?') : r.fase === 'puxa' ? 'Puxa...' : 'Solta...'}
      </button>
      <div className="marcas">{[0, 1, 2].map((i) => <span key={i} className={i < r.feitas ? 'feita' : ''} />)}</div>
    </div>
  )
  return { tocar, tela }
}

// Contar até 5 tocando nos números.
const NUMEROS = ['Um', 'Dois', 'Três', 'Quatro', 'Cinco']
export function useContar(aoTerminar: () => void) {
  const [n, setN] = useState(0)
  function tocar() {
    if (n >= 5) return
    sfx.toque()
    setN(n + 1)
    falar(NUMEROS[n])
    if (n + 1 === 5) setTimeout(aoTerminar, 900)
  }
  const tela = (x: number, y: number) => (
    <div className="contar" style={{ left: x, top: y }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} className={`numero ${i <= n ? 'aceso' : ''} ${i === n + 1 ? 'proximo' : ''}`} onClick={tocar}>{i}</button>
      ))}
    </div>
  )
  return { n, tocar, tela }
}

// Lumi "respirando" com o abafador por cima (a equipe não tem pose de abafador; a proporção foi medida no canvas Doop).
export function LumiAbafador({ cor, x, y, h, abafador }: { cor: Cor; x: number; y: number; h: number; abafador: boolean }) {
  return (
    <>
      <Lumi pose="respirando" cor={cor} x={x} y={y} h={h} />
      {abafador && <img className="abafador" src="/cena/abafador.svg" alt="" style={{ left: x - 0.077 * h, top: y - 0.081 * h, width: 0.854 * h }} />}
    </>
  )
}

// O que a professora faz com a tecla quando a cena não está esperando: tocar no que está "chamando".
export function useTecla(ctx: Ctx, f: (() => void) | undefined) {
  useEffect(() => void (ctx.acao.current = f))
}

// Fim da estratégia: o Lumi diz como está (o sentimento diminui, não some) e a cena segue para a transição.
export const pronto = (ctx: Ctx, fala: string) => (ctx.dizer(fala), ctx.seguir(() => ctx.ir('transicao'), dur(fala) + 400))

export const AvisoLeve = () => <div className="aviso aviso-leve"><span className="ampulheta" />Daqui a pouquinho...</div>
export const AvisoForte = ({ icone, texto }: { icone: Atividade; texto: string }) => (
  <div className="aviso aviso-forte"><span className="sino"><Icone nome={icone} /></span>{texto}</div>
)
