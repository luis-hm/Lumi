# Lumi e as Emoções: protótipo da Parte 2

> Fontes: documento oficial da equipe (Blocos 1–4), rascunho "Sistema educacional" e arte da
> pasta `lumi_designs` do Drive. Alvo: **rodar no notebook durante a apresentação**.

## 1. O que o sistema resolve

A crise da criança não vem da atividade: vem do **momento em que a atividade acaba e ela é pega de
surpresa** (Professora B). O Lumi é um ensaio seguro desse momento. A criança vive, pelo personagem,
a sequência *vai acabar → o que eu sinto → o que eu faço → acabou e ficou tudo bem*, e repete até
virar repertório para a vida real.

Frase-guia (persona Tícia): **uma atividade pode terminar sem que isso seja algo ruim.**

## 2. Fluxo

```text
Início ─┬─ Cor do Lumi ─→ Início
        └─ Iniciar → Escolher situação → CENA
CENA: brincar junto (anel do "Agora" enche) → aviso leve "daqui a pouquinho"
    → sinal de transição (visual + sino) → Lumi fica triste
    → criança identifica a emoção (Lumi acolhe e dá nome ao que sente)
    → criança escolhe a estratégia → faz junto com o Lumi
    → guarda os brinquedos (a transição em si) → Conseguimos! (antes→agora, adesivo)
    → "E você?" (pergunta para a criança, pausa para o adulto conversar)
    → Lumi se despede e o jogo volta sozinho ao início (o jogo também acaba)
```

| Passo | O que a criança faz | Doc |
|---|---|---|
| Brincar | Toca nos blocos para montar a torre com o Lumi (e derrubar). Sente o "quero continuar". | §1.7 cenário |
| Aviso leve | Vê o anel do **Agora: Brincar** encher e ouve "daqui a pouquinho". Antecipa a mudança. | T1, §2.6 |
| Sinal | Faixa "Hora de guardar os brinquedos!" + sino. O Lumi diz o que sente no corpo ("minha barriga ficou apertada") e fica triste. | T1, RF03 |
| Emoção | O Lumi lê cada carinha em voz alta (destacando). A criança toca numa das 3. Qualquer uma é acolhida; o Lumi diz o que **ele** sente. | T2, RF05 |
| Estratégia | O Lumi lê cada opção em voz alta (destacando). A criança escolhe respirar, contar ou dar tchau. | T3, RF06–07 |
| Fazer junto | Respirar: toca no balão 3x. Contar: toca nos números 1–5. Tchau: toca em cada bloco. (Cada cenário tem as suas, ver abaixo.) | T4, RF08 |
| Guardar | Toca nos blocos, que voam para a caixa. | T5 |
| Conseguimos | Vê a carinha de antes (triste) e a de agora (calmo) e ganha o adesivo. | RF09, RF11, RF12 |

Regras que não mudam: nenhum caminho de erro (RF10, R-IHC09), todo toque responde na hora com som
e movimento (R-IHC05, R-IHC10), opções balançam após 8 s sem toque (dica sem cobrança) e a fala
sempre aparece em balão (legenda para o adulto).

### Modo teatro (`/?teatro`)

A professora conduz a cena projetada para a turma: o Lumi fala com "vocês" e **nada avança sozinho**.
Ela controla pelo teclado ou por um passador de slides comum. Entra só pelo link, para uma criança
não cair nele sem querer e ficar presa esperando.

| Tecla | Faz |
|---|---|
| Espaço, →, PageDown, Enter | avança: enche o anel (metade por vez), segue a história, ou toca no que está chamando (balão, número, bloco, cartão, ampulheta, nota, balanço, balão da festa) |
| ←, PageUp, R | repete a última fala |
| 1–3 | registra a emoção / estratégia que a turma escolheu |
| V | liga/desliga a voz (desligada, a professora faz a voz do Lumi e lê o balão) |
| Esc | volta ao início |

A seta amarela piscando no canto inferior direito indica que a cena está parada esperando a professora.
Os cliques continuam funcionando: uma criança pode ir até o notebook montar a torre ou guardar os blocos.

### Cenários

Os cenários foram revistos para a sala com crianças com TEA e TDAH. O desenho completo, com corpo,
carinhas, estratégias, material para a sala e cuidados, está em [CENARIOS.md](CENARIOS.md).

Os 4 estão jogáveis, no jogo e no modo teatro. A tabela usa o passo "fazer junto" de cada estratégia.

| Cenário | Agora → Depois | Para quem pesa mais | Fazer junto |
|---|---|---|---|
| Parar o que eu gosto | Brincar → Roda (blocos na caixa do depois) | hiperfoco (TEA, TDAH) | respirar no balão · contar até 5 · dar tchau para cada bloco |
| Mudou o plano | Roda → ~~Parque~~ → Massinha | previsibilidade (TEA) | tocar no cartão de mudança da agenda · escolher massinha ou desenhar · respirar |
| Esperar a vez | Vez do amigo → Minha vez (balanço) | controle do impulso (TDAH) | virar a ampulheta e ver a areia cair · apertar as mãos e contar · cantar 7 notas; o anel "Vez do amigo" enche junto |
| Barulho demais | Festa → Parabéns → Cantinho → Festa | sensorial (TEA) | pôr o abafador · mostrar o cartão de pausa ("pode ir, Lumi") · ir para a cabana; o medidor de barulho baixa |

A arte nova (cards de estratégia, agenda, balanço, ampulheta, festa, abafador, cabana) foi desenhada
em SVG no estilo da equipe, no canvas Doop, página "Cenários TEA/TDAH". O Lumi é sempre a arte da equipe.

## 3. Stack

| Item | Escolha |
|---|---|
| App | Next.js (App Router) + React + TypeScript, sem backend. O jogo é um Client Component carregado com `ssr: false` (usa voz, áudio e localStorage). Palco fixo de 1280×720 escalado para a tela. |
| Estado | `useState` por tela. `src/jogo/Cena.tsx` é o motor da cena (passos, emoção, estratégia, final, teatro); cada cenário é um arquivo em `src/jogo/cenarios/` com seus dados e o seu `Palco` (cenário, objetos, falas). Peças comuns (anel, respirar, contar) em `motor.tsx`. |
| Voz | `speechSynthesis` em pt-BR (voz do sistema). Trocar por mp3 gravado se a equipe gravar. |
| Sons | WebAudio (sino, toque, bloco, festa, chuva, palmas, notas) em `som.ts`. Sem arquivos. Volume baixo de propósito. |
| Progresso | `localStorage`: cor do Lumi e adesivos. |
| Arte | `tools/assets.py` converte a pasta do Drive em `web/public/` (recorta o fundo verde dos vídeos, separa sprites, recolore o Lumi nas 4 cores e limpa o tapete). |

Cortado neste protótipo: PWA, Django, área do adulto e login.

## 4. Rodar

```bash
cd web && npm install
npm run build && npm start      # http://localhost:3000, F11 para tela cheia (use isto na apresentação)
npm run dev                     # desenvolvimento
```

Para abrir por link em qualquer notebook: importar a pasta `web/` na Vercel (projeto Next, sem configuração).

Para regenerar a arte depois de mudanças no Drive, baixe a pasta `lumi_designs` (com os vídeos em `v/`)
e rode `python -I tools/assets.py <pasta> web/public` (precisa de pillow, numpy, scipy e av).
