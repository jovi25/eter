# ROADMAP

Uma fase por vez. Ao fim de cada fase: testes, build, commit, resumo e instruções de teste no celular. **Parar e esperar feedback.**

Prioridade se o tempo apertar: partida divertida > herói > relicário > resto.

## Fase 0 — Fundação
- [x] Vite + TypeScript strict + Phaser 4 + Vitest
- [x] Cena de boot
- [x] Escala 720×1280, `Scale.FIT`, retrato
- [x] Overlay de debug (fps, tick, seed)
- [x] PWA (manifest + service worker via `vite-plugin-pwa`)
- [x] Instruções para abrir no celular
- **Aceite:** abro o link no celular e vejo uma tela 9:16 com fps.

## Fase 1 — Simulação
- [ ] `src/sim/`: caminho, ondas, inimigos, torres, mira, projéteis
- [ ] Status, tabela de reações, combo
- [ ] Ouro e vidas
- [ ] Testes: cada reação, imunidade de Enraizado, determinismo por seed
- **Aceite:** `npm test` verde.

## Fase 2 — Partida jogável
- [ ] Renderização procedural, input por toque, menu radial
- [ ] HUD (ouro, vidas, onda, 2×, chamar onda)
- [ ] 10 ondas + Chefe MVP, vitória/derrota com estrelas
- [ ] Juice da seção 6 do GDD
- **Aceite:** jogo uma fase completa no celular em ~3 min e vejo INCÊNDIO.

## Fase 3 — Herói
- [ ] Arcanista em campo, movimento por toque, ataque automático
- [ ] Catalisar com redução de cooldown por reação
- **Aceite:** sinto o loop "reação → habilidade volta mais rápido".

## Fase 4 — Meta e relicários
- [ ] Save versionado + exportar/importar
- [ ] Mapa-mundo com 5 fases; coins
- [ ] Conquistas e missões diárias
- [ ] Relicário completo (1º roteirizado)
- [ ] Coleção de torres com níveis
- [ ] Equipamentos: ressonância, encaixes, cartas, refino; tela de herói
- **Aceite:** venço a fase 1, abro o primeiro relicário, ganho o Cristal Gélido e sinto o pico.

## Fase 5 — Balanceamento e playtest
- [ ] Estatísticas da última partida exportáveis em CSV
- [ ] Ajuste dos números em `src/data/`
- [ ] `docs/PLAYTEST.md`
- **Aceite:** dificuldade crescente nas 5 fases; fase 5 exige combos.
