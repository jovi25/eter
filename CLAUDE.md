# CLAUDE.md — Projeto ÉTER

Tower defense mobile (retrato) com combos elementais, herói catalisador e relicários.
Design completo: `docs/GDD.md` (fonte da verdade). Fases: `docs/ROADMAP.md`.
Briefing original: `KICKOFF_CLAUDE_CODE.md`.

## Sobre o usuário
- Zero experiência com programação. Explicar em português simples, sem jargão, **como testar** ao fim de cada fase.
- Conversa em português. Código, arquivos e identificadores em inglês; textos de UI em português.
- Quer ser contrariado quando houver base. Sinalizar toda decisão padrão não especificada.
- Orçamento zero: nada pago.

## Regras de trabalho
1. Uma fase por vez. Ao fim: `npm test`, `npm run build`, commit git, resumo ≤10 linhas + passo a passo de teste no celular. **Parar e esperar feedback.**
2. Não adicionar dependências além de: phaser, typescript, vite, vitest, vite-plugin-pwa. Perguntar antes.
3. Sem rede, analytics, login ou coleta de dados. Offline-first.
4. Propriedade intelectual: nada de nomes, sprites, sons ou termos de outros jogos. Tudo original ou CC0.
5. Todo número de balanceamento em `src/data/*.ts`.
6. Phaser 4: em dúvida sobre API, consultar docs/repositório oficial antes. Se travar, propor Phaser 3.x.
7. Preferir o simples que funciona; avisar e propor cortes.

## Regra de design gravada
**`gems` nunca compram nada aleatório, nem convertem em `coins`.** Só itens de conteúdo conhecido.
Três moedas separadas: `gold` (partida), `coins` (ganhas jogando), `gems` (premium, futuro).

## Comandos
- `npm install` — instala dependências
- `npm run dev` — servidor local (já expõe na rede: `--host`)
- `npm test` — testes (Vitest)
- `npm run build` — build de produção em `dist/`
- `npm run preview` — serve o build (com PWA ativo)

## Publicação
- Repositório: https://github.com/jovi25/eter (público). Jogo: https://jovi25.github.io/eter/
- Todo `git push` na `main` testa, gera o build e publica no GitHub Pages (`.github/workflows/deploy.yml`).
- `KICKOFF_CLAUDE_CODE.md` fica **só no computador** (está no `.gitignore`); não publicar.
- GitHub CLI: `C:\Program Files\GitHub CLI\gh.exe` (logado como jovi25). Commits usam o e-mail noreply do GitHub.
- O PC está numa rede Wi-Fi marcada como pública com o Node bloqueado no firewall, então o teste por `--host` na rede local não funciona; testar pelo link do Pages.

## Arquitetura
- `src/sim/` — TypeScript puro, **sem Phaser**. Estado, ondas, inimigos, torres, status, reações, economia. Tick fixo (30/s), RNG com seed (determinístico). Emite eventos por um event bus.
- `src/view/` — Phaser. Só lê o estado da simulação e reage a eventos (`reactionTriggered`, `enemyKilled`, `waveCleared`, `relicOpened`...). Todo o juice vive aqui.
- `src/data/` — conteúdo e balanceamento (torres, inimigos, elementos, reações, equipamentos, cartas, conquistas, fases, drops).
- `src/assets/manifest.ts` — todo visual referenciado por chave; arte procedural hoje, CC0 amanhã.
- Pooling de projéteis, partículas e textos. Meta 60 fps em Android intermediário.
- Resolução base 720×1280, `Scale.FIT`, retrato. Toques ≥ 48 px.
- Save: `localStorage`, JSON versionado com migrações + exportar/importar texto.
