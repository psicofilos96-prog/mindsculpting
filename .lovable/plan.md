
# NeuroTrainer — v1 (PWA · Cálculo Mental)

App web instalável no Android (PWA) focado em treino cognitivo. Nesta primeira entrega, entregamos o **módulo de Cálculo Mental completo** e a estrutura pronta para receber os próximos módulos (Memorização, 2048 Aritmético, Escuta Dicótica) em iterações futuras.

## Rotas

```text
/                      Home — cards dos módulos + streak/melhores marcas
/calculo               Seleção de nível (Fácil / Médio / Difícil / Einstein)
/calculo/jogar         Tela de jogo (sequência + resposta)
/calculo/resultado     Resumo da rodada + histórico local
/sobre                 Explicação neurocientífica de cada treino
```

Módulos futuros aparecem no home como cards "Em breve", desabilitados.

## Módulo Cálculo Mental — regras

**Níveis**
| Nível | Operações | Passos | Tempo por número |
|---|---|---|---|
| Fácil | +, − | 3–4 | ~2.0s |
| Médio | ×  (com + e −) | 4–5 | ~1.4s |
| Difícil | ÷ (com +, −, ×) — divisões sempre exatas | 4–5 | ~1.0s |
| Einstein | mistura livre das 4 | 6–7 | ~0.8s |

**Fluxo de uma rodada**
1. Countdown "3 · 2 · 1"
2. Número inicial aparece cheio de tela
3. Sequência de operandos (`+3`, `−9`, `×2`, `÷4`) cada um pelo tempo do nível
4. Tela "?" pede resposta
5. **Modo Alternativas (padrão):** 5 opções — 1 correta + 4 armadilhas geradas por:
   - trocar sinal de um operando
   - ignorar o último passo
   - inverter uma subtração/divisão
   - erro de sinal no resultado
6. **Modo Digitação (toggle):** teclado numérico, sem opções — recall puro
7. Feedback imediato (verde/vermelho + resposta correta)
8. 10 rodadas por sessão → tela de resultado (acertos, tempo médio, XP)

**Geração dos problemas**
- Divisões e multiplicações são pré-computadas para manter resultados inteiros e dentro de uma faixa "carregável mentalmente" (|resultado| ≤ 999 em Fácil/Médio, ≤ 9999 em Difícil/Einstein).
- Seed opcional para reproduzir a rodada.

## Persistência local (sem backend)

`localStorage` com uma única chave `neurotrainer:v1` contendo:
- Preferências (nível preferido, modo digitação on/off, som on/off)
- Estatísticas por nível: partidas, acertos, tempo médio, melhor streak
- Últimas 20 rodadas (para gráfico simples de evolução)

Hook `useLocalProgress()` centraliza leitura/escrita com validação Zod, e o acesso é feito dentro de `useEffect` para evitar mismatch de SSR.

## Design — tema escuro neuro-científico

Tokens em `src/styles.css` (oklch):
- `--background` quase-preto azulado
- `--foreground` off-white
- `--primary` ciano elétrico (accent principal, botões, número em foco)
- `--accent` roxo/violeta (destaques secundários, "Einstein")
- `--destructive` vermelho suave para erros
- Gradiente `--gradient-neural` (ciano→roxo) para hero e cards de nível
- `--shadow-glow` (halo do accent) nos números durante a sequência

Tipografia carregada via `<link>` no `__root.tsx`:
- Headings: **Space Grotesk** (técnico, geométrico)
- Corpo: **Inter**
- Números do jogo: **JetBrains Mono** (tabular, monoespaçada — números não "dançam" ao trocar)

Interações:
- Framer Motion: cada número entra com fade+scale, sai com blur
- Barra de progresso da sequência no topo
- Vibração leve (`navigator.vibrate`) em acerto/erro se suportado
- Mobile-first, toda tela pensada em retrato 360–430px

## PWA (instalável no Android)

Apenas manifest + ícones (sem service worker offline, conforme skill de PWA):
- `public/manifest.webmanifest` com `display: standalone`, `theme_color` = background, `background_color` = background, `start_url: "/"`
- Ícones 192/512 (maskable) gerados
- Tags no `__root.tsx`: `link rel=manifest`, `meta theme-color`, `apple-touch-icon`
- Meta português: `<html lang="pt-BR">`, title/description/OG específicos

Chrome Android mostrará o prompt "Adicionar à tela inicial" automaticamente.

## Estrutura de arquivos

```text
src/
  routes/
    __root.tsx                 (atualizar: manifest, fontes, lang pt-BR, meta)
    index.tsx                  (home reescrita — cards dos módulos)
    calculo.tsx                (layout com <Outlet/>)
    calculo.index.tsx          (seleção de nível + toggle modo digitação)
    calculo.jogar.tsx          (tela de jogo)
    calculo.resultado.tsx      (resumo da rodada)
    sobre.tsx                  (explicação neurocientífica)
  features/calculo/
    engine.ts                  (gera problema por nível, calcula resposta, gera armadilhas)
    types.ts                   (Level, Problem, RoundResult — Zod)
    useCalculoGame.ts          (hook de estado da rodada)
    Sequence.tsx               (mostra números com timing e animação)
    AnswerChoices.tsx          (5 opções)
    AnswerInput.tsx            (teclado numérico)
    LevelCard.tsx
  features/progress/
    storage.ts                 (get/set com Zod)
    useLocalProgress.ts
  components/
    AppShell.tsx, ModuleCard.tsx, StatBadge.tsx
  styles.css                   (tokens do tema escuro)
  public/
    manifest.webmanifest, icon-192.png, icon-512.png (gerados)
```

## Detalhes técnicos

- **TanStack Start / Router** com rotas file-based conforme já configurado. Nada de `src/pages/`.
- **TypeScript strict**, `zod` para validar payloads do localStorage.
- **Timers** com `setTimeout` encadeado + cleanup no unmount; pausa ao trocar de aba (`document.visibilitychange`) para não quebrar a rodada.
- **Sem backend**: tudo client-side; nada de Lovable Cloud nesta v1.
- **Acessibilidade**: botões com `aria-label`, foco visível, tamanho mínimo 44px, contraste AA no tema escuro.
- **Viewport** do preview será trocado para mobile para inspeção.

## Fora do escopo desta v1 (próximas iterações)

- Memorização de números/letras (com progressão adaptativa, recall reverso, chunking)
- 2048 Aritmético (fusões por operação/cor)
- Escuta Dicótica (áudio estéreo por canal)
- Sincronização em nuvem / login

Cada um vira uma rota nova (`/memoria`, `/2048`, `/dicotico`) reutilizando `AppShell` e `useLocalProgress`.
