# ROADMAP — Plano 2.0

> Reescrito na "carta branca" (nov/2026). O plano antigo empilhava sistemas de MMO (equipamento, refino, encaixes, cartas)
> antes de o jogo ter motivo para ser rejogado. O Plano 2.0 inverte: **primeiro a vontade de jogar de novo, depois a coleção.**

## A pergunta que guia tudo
**"Por que eu jogaria mais uma partida?"** Cada fase abaixo tem de dar uma resposta nova.

## Os 4 pilares
1. **Cada partida é diferente** — Bênçãos de Éter (escolha 1 de 3 poderes), Gosma Dourada, herói escolhido.
2. **Dá para ficar bom** — reações elementais, fraquezas dos inimigos, posicionamento do herói. Habilidade vence número.
3. **Sempre há um recorde para bater** — Fenda Infinita, estrelas, desafios por fase, desafio diário.
4. **O que eu ganho muda como eu jogo** — recompensas destravam *opções* (bênçãos novas, heróis, talentos), não só +5% de dano.

Regras de trabalho continuam: uma etapa por vez, testes + build + commit, instruções de teste no celular, parar e ouvir o jogador.

---

## Feito
- [x] **Fase 0** — Fundação (Vite, TypeScript, Phaser 4, testes, PWA, GitHub Pages)
- [x] **Fase 1** — Simulação pura e determinística
- [x] **Fase 2** — Partida jogável com juice e sons
- [x] **Fase 3** — Herói em campo
- [x] **Fase 4a** — Região 1: 5 fases com mapas diferentes, fraquezas/resistências, mapa-mundo, save
- [x] **Fase 4b** — 4 classes de herói com ataque e habilidade automáticos; bloqueio corpo a corpo; urso
- [x] **Fase 5 — "Mais uma partida"** *(esta entrega)*
  - [x] Bênçãos de Éter: a cada 3 ondas, escolha 1 de 3 poderes que se acumulam (17 bênçãos, 3 raridades)
  - [x] Raio entra nos combos: SOBRECARGA (Queimando + Raio) e SUPERCONDUÇÃO (Resfriado + Raio)
  - [x] Gosma Dourada: bônus que corre; não tira vida, paga muito ouro
  - [x] Fenda Infinita: 40 ondas cada vez mais duras, recorde salvo (libera ao vencer a fase 2)
  - [x] Heróis redesenhados em camadas (capa, corpo, braço com arma), com animação de ataque e deslize

## Próximas etapas

### Fase 6 — Maestria (dar motivo para rejogar cada fase) ✔
- [x] **3 desafios por fase** além das estrelas, salvos e mostrados no mapa, no cartão da fase e no fim da partida
- [x] **Desafio diário**: mesma fase, herói, bênção inicial e seed para todo mundo; melhor pontuação do dia
- [x] **Reforço** de torre após o nível 3 (uso infinito para o ouro; pedido do jogador)
- [x] Desempenho: números de dano em fonte pré-desenhada, barras de vida em lote, menos redesenhos
- [x] **Códice**: inimigos e reações descobertos jogando (fraquezas, receitas, efeitos)
- [x] Tela de estatísticas da partida (dano por torre e herói, reações por tipo) com exportar CSV
- [x] **Música de fundo** composta por código, um tema por fase + mapa, que acompanha a intensidade da luta
- [x] **Altar de Éter** na Fenda (ouro → Bênção extra) e **Trocar cartas** (ouro → novas opções) em todo modo
- [x] Qualidade automática: em celular lento, corta partículas e números pequenos (não muda a jogabilidade)
- *Aceite:* depois de vencer a fase 5, ainda tenho objetivos claros em todas as fases.

### Fase 7 — Relicários que importam (o pico de dopamina) ✔
- [x] Relicário com abertura por 4 toques, escalada de raridade, pré-sorteio salvo, chances visíveis e garantia (Épica+ a cada 10)
- [x] Conteúdo que **muda o jogo**: 5 bênçãos novas para o baralho, **bênção inicial** (Pergaminho Antigo); talentos ficam para a Fase 8
- [x] `coins` por partida, estrelas, 1ª vitória, desafios novos, Fenda e desafio do dia; baú por 150 moedas
- [x] Sem refino e sem encaixes: 14 **Relíquias** (4 raridades, 3 níveis), até 3 equipadas, a maioria com um custo
- [x] Exportar CSV removido a pedido do jogador
- *Aceite:* abrir um relicário me faz querer testar uma estratégia nova na partida seguinte.

### Fase 7b — Pedidos do jogador (nov/2026) ✔
- [x] Região 1 vira **tutorial**: 18 dicas que aparecem na hora certa (pausa + seta), uma vez por aparelho; "Rever dicas" em Opções
- [x] **Menu do mapa** com ícones pintados: Desafio do dia, Relicário, Códice, Opções (som, música, econômico, backup)
- [x] **Runas**: pedras rúnicas no chão (2 por mapa, a partir da fase 3 e na Fenda), Pressa ou Poder para as torres no círculo
- [x] **Modo econômico** (automático em celular fraco): 30 fps, resolução 75%, sem eco no som; menus sempre a 30 fps
- [x] Fenda paga mais: 5 por onda + 40 a cada 10 ondas + 150 por vencer as 40 (≈ 510 moedas)

### Fase 7c — Evoluções e desempenho ✔
- [x] **Evoluções de torre**: no nível 3, escolher 1 de 2 formas finais (golpe final lento × efeito constante), 10 no total
- [x] Desempenho: formas vetoriais viram imagens prontas (o maior custo do quadro), raios em imagens, números sem animações,
      textos reaproveitados; sem limitador de fps (causava engasgos)

### Fase 8 — Heróis com identidade ✔
- [x] Nível de herói (1–5) jogando com ele: 1 XP por onda vencida + 5 na vitória
- [x] 3 talentos por herói (liberados nos níveis 2, 3 e 4; equipa 1): mudam o estilo, não só os números
- [x] Arma do Arcanista troca o elemento (Brasa, Geada, Trovão nv 2, Seiva nv 3) → combos diferentes
- [x] 2ª habilidade automática por classe no nível 5
- [x] Desafio do dia ignora talentos, arma e 2ª habilidade (igual para todos)
- *Aceite:* dois jogadores com o mesmo herói jogam de formas diferentes.

### Fase 9 — Região 2 e chefes com mecânica ✔
- [x] **Mapas maiores**: 1,5 tela de altura (1920 px), arrastar para rolar, barra de posição e contador ▲▼ de inimigos fora da tela; 10–14 espaços e 3–4 pedras rúnicas
- [x] Região 2 "Ermos de Âmbar": 5 fases de 12 ondas, chão dourado e árvores de outono, músicas próprias, abas de região no mapa
- [x] Elemento novo: **Comporta** (tocar troca o caminho dos próximos inimigos) nas fases 2 e 5
- [x] 2 chefes com **escudo elemental** em fases (Sentinela de Âmbar, Devorador de Éter); o cartão da fase mostra os escudos antes

### Fase 9b — Torres de fusão ✔
- [x] Duas torres nível 3 de elementos que reagem, a até 280 px, viram uma (150 de ouro): fica no lugar da primeira e libera o espaço da outra
- [x] 5 fusões: Gêiser de Vapor, Coração da Queimada, Fornalha Elétrica, Jardim de Geada, Agulha Polar — cada disparo marca e detona a reação no mesmo alvo
- [x] Menu: botão FUNDIR no nível 3; as parceiras possíveis brilham com o nome da fusão; tocar nela confirma
- *Aceite:* a região 2 exige montar a build pensando no chefe.

### Fase 10 — Polimento e balanceamento
- [ ] Música gerada por código, mais vozes de inimigos
- [ ] Tutorial jogável de 60 s (INCÊNDIO guiado)
- [ ] `npm run balance` cobrindo heróis × bênçãos; `docs/PLAYTEST.md`
- [ ] Acessibilidade: modo daltônico para elementos, tamanho de texto

## No radar (não agora)
Co-op, nuvem, Passe de Missões e loja de gems (gems nunca compram nada aleatório), guildas, Capacitor para lojas,
classificação indicativa e ECA Digital antes de qualquer monetização.
