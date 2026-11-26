'use client'
import { useEffect, useState } from 'react'
import Cena from './Cena'
import { CENARIOS } from './cenarios'
import { calar, falar } from './som'
import { arquivoLumi, Botao, Icone, Lumi, POSES, type Cor } from './ui'

type Tela = 'inicio' | 'cor' | 'cenas' | 'cena'
type Salvo = { cor: Cor; adesivos: string[] }

const salvo: Salvo = { cor: 'azul', adesivos: [], ...JSON.parse(localStorage.getItem('lumi') ?? '{}') }
// /?teatro: a professora conduz a cena projetada para a turma (ver Cena.tsx). Por link, pra criança não cair nele sem querer.
const TEATRO = new URLSearchParams(location.search).has('teatro')
const CORES: Cor[] = ['azul', 'vermelho', 'verde', 'amarelo']
const NOME_COR: Record<Cor, string> = { azul: 'azul', vermelho: 'vermelho', verde: 'verde', amarelo: 'amarelo' }


export default function App() {
  const [tela, setTela] = useState<Tela>('inicio')
  const [cor, setCor] = useState<Cor>(salvo.cor)
  const [adesivos, setAdesivos] = useState<string[]>(salvo.adesivos)
  const [rodada, setRodada] = useState(0)
  const [cen, setCen] = useState(CENARIOS[0])
  const [escala, setEscala] = useState(1)
  const [fala, setFala] = useState('')

  useEffect(() => localStorage.setItem('lumi', JSON.stringify({ cor, adesivos })), [cor, adesivos])
  // Pré-carrega as poses da cor escolhida para a troca não piscar na apresentação.
  useEffect(() => POSES.forEach((p) => (new Image().src = arquivoLumi(p, cor))), [cor])
  useEffect(() => {
    // Palco fixo 1280×720 escalado para caber na tela do notebook (16:9).
    const ajustar = () => setEscala(Math.min(innerWidth / 1280, innerHeight / 720))
    ajustar()
    addEventListener('resize', ajustar)
    return () => removeEventListener('resize', ajustar)
  }, [])

  const ir = (t: Tela) => (calar(), setFala(''), setTela(t))
  const dizer = (t: string) => (setFala(t), falar(t))

  return (
    <div className="palco" style={{ transform: `translate(-50%, -50%) scale(${escala})` }}>
      {tela === 'inicio' && (
        <div className="tela" style={{ backgroundImage: 'url(/bg/sala-azul.jpg)' }}>
          <img className="logo" src="/ui/logo.webp" alt="Lumi e as Emoções" />
          {TEATRO && <span className="selo-teatro">Modo teatro</span>}
          <div className="menu">
            <Botao onClick={() => (ir('cenas'), setTimeout(() => dizer('Oi! Eu sou o Lumi. Escolhe um momento do meu dia pra gente viver junto!'), 200))}>
              Iniciar<Icone nome="play" />
            </Botao>
            <Botao tom="secundario" onClick={() => (ir('cor'), setTimeout(() => falar('Qual cor você quer pra mim?'), 200))}>
              Cor do Lumi<Icone nome="pincel" />
            </Botao>
          </div>
          <Lumi pose="acenando" cor={cor} x={720} y={170} h={500} />
        </div>
      )}

      {tela === 'cor' && (
        <div className="tela" style={{ backgroundImage: 'url(/bg/sala-azul.jpg)' }}>
          <h1 className="titulo" style={{ top: 50 }}>Qual cor você quer pro Lumi?</h1>
          <div className="cores">
            {CORES.map((c) => (
              <button key={c} className={`opcao-cor ${c === cor ? 'escolhida' : ''}`} aria-label={NOME_COR[c]}
                onClick={() => (setCor(c), dizer(`Eba! Agora eu sou ${NOME_COR[c]}!`))}>
                <img src={`/lumi/cor-${c}.webp`} alt="" />
                {c === cor && <span className="selo"><Icone nome="estrela" /></span>}
              </button>
            ))}
          </div>
          {fala && <div key={fala} className="balao balao-centro">{fala}</div>}
          <Botao tom="sol" style={{ position: 'absolute', left: 520, top: 610, width: 240 }} onClick={() => ir('inicio')}>Pronto!</Botao>
        </div>
      )}

      {tela === 'cenas' && (
        <div className="tela" style={{ backgroundImage: 'url(/bg/sala-amarela.jpg)' }}>
          <button className="redondo" style={{ position: 'absolute', left: 28, top: 28 }} aria-label="Início" onClick={() => ir('inicio')}><Icone nome="casa" /></button>
          <h1 className="titulo" style={{ top: 50 }}>Vamos ajudar o Lumi?</h1>
          <div className="situacoes">
            {CENARIOS.map((c) => (
              <button key={c.id} className="situacao" onClick={() => (setCen(c), setRodada((r) => r + 1), ir('cena'))}>
                <img src={c.card} alt="" />
                <span className="rotulo">{c.nome}</span>
                {adesivos.includes(c.id) && <span className="selo"><Icone nome="estrela" /></span>}
              </button>
            ))}
          </div>
          <Lumi pose="apontando" cor={cor} x={30} y={350} h={350} />
          {fala && <div key={fala} className="balao cauda-esquerda" style={{ left: 330, top: 580, width: 700 }}>{fala}</div>}
        </div>
      )}

      {tela === 'cena' && (
        <Cena key={rodada} cen={cen} cor={cor} teatro={TEATRO} onSair={() => ir('inicio')}
          onConcluir={() => setAdesivos((a) => (a.includes(cen.id) ? a : [...a, cen.id]))} />
      )}
    </div>
  )
}
