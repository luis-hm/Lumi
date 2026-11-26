// Voz (speechSynthesis pt-BR) + efeitos sonoros (WebAudio). Feedback sempre em 2 canais (R-IHC05).
let ultima = ''
let voz: SpeechSynthesisVoice | undefined
const acharVoz = () => {
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').startsWith('pt-BR'))
  voz = vs.find((v) => /francisca|maria|luciana|female|feminina/i.test(v.name)) ?? vs[0]
}
acharVoz()
speechSynthesis.onvoiceschanged = acharVoz

// Teatro: a professora pode desligar a voz e fazer ela mesma a voz do Lumi (o balão continua como roteiro).
let mudo = false
export const estaMudo = () => mudo
export const alternarVoz = () => ((mudo = !mudo) && calar(), mudo)

// lembrar=false: fala avulsa (leitura de opção) que o "ouvir de novo" não deve repetir no lugar da pergunta.
export function falar(texto: string, lembrar = true) {
  if (lembrar) ultima = texto
  speechSynthesis.cancel()
  if (mudo) return
  const u = new SpeechSynthesisUtterance(texto)
  u.lang = 'pt-BR'
  if (voz) u.voice = voz
  u.rate = 0.95
  u.pitch = 1.2
  speechSynthesis.speak(u)
}
export const falarDeNovo = () => ultima && falar(ultima)
export const calar = () => speechSynthesis.cancel()
// ponytail: duração estimada pela fala (onend do Chrome não é confiável); trocar por áudio gravado se a equipe gravar.
export const dur = (texto: string) => 900 + texto.length * 65

let ctx: AudioContext | undefined
function tom(freq: number, inicio: number, dura: number, tipo: OscillatorType = 'sine', vol = 0.2) {
  ctx ??= new AudioContext()
  const t = ctx.currentTime + inicio
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = tipo
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dura)
  o.connect(g).connect(ctx.destination)
  o.start(t)
  o.stop(t + dura + 0.05)
}

// Ruído suave (chuva, palmas da festa). ponytail: volumes baixos de propósito: o cenário "barulho demais" é para crianças sensíveis a som.
function ruido(inicio: number, dura: number, vol: number, corte = 1200) {
  ctx ??= new AudioContext()
  const t = ctx.currentTime + inicio
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dura), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  const f = ctx.createBiquadFilter()
  const g = ctx.createGain()
  src.buffer = buf
  f.type = 'lowpass'
  f.frequency.value = corte
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + dura * 0.2)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dura)
  src.connect(f).connect(g).connect(ctx.destination)
  src.start(t)
}

export const sfx = {
  toque: () => (tom(660, 0, 0.09), tom(990, 0.05, 0.12)),
  bloco: () => tom(300, 0, 0.14, 'triangle', 0.25),
  sino: () => (tom(784, 0, 1.4, 'sine', 0.22), tom(1047, 0.4, 1.6, 'sine', 0.18)),
  festa: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tom(f, i * 0.11, 0.35, 'triangle', 0.16)),
  respira: (subindo: boolean) => tom(subindo ? 392 : 294, 0, 3.2, 'sine', 0.07),
  chuva: () => ruido(0, 3, 0.05, 900),
  palmas: () => [0, 0.2, 0.4, 0.55, 0.7, 0.9, 1.05, 1.2].forEach((s) => ruido(s, 0.09, 0.07, 3000)),
  nota: (freq: number) => tom(freq, 0, 0.45, 'triangle', 0.18),
  vira: () => (tom(520, 0, 0.12), tom(390, 0.1, 0.18)),
}
