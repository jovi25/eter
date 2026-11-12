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

### Fase 8 — Heróis com identidade
- [ ] 3 talentos por herói (escolhe 1 por nível): mudam o estilo, não só os números
- [ ] Arma do Arcanista troca o elemento (Brasa, Geada, Trovão, Seiva) → combos diferentes
- [ ] 2ª habilidade automática por classe em nível alto
- *Aceite:* dois jogadores com o mesmo herói jogam de formas diferentes.

### Fase 9 — Região 2 e chefes com mecânica
- [ ] 5 fases novas com um elemento de mapa novo (pontes que abrem/fecham, portal que troca de lado)
- [ ] 2 chefes com fases (escudo elemental que só quebra com a reação certa)
- [ ] Torre nova de elemento duplo por fusão
- *Aceite:* a região 2 exige montar a build pensando no chefe.

### Fase 10 — Polimento e balanceamento
- [ ] Música gerada por código, mais vozes de inimigos
- [ ] Tutorial jogável de 60 s (INCÊNDIO guiado)
- [ ] `npm run balance` cobrindo heróis × bênçãos; `docs/PLAYTEST.md`
- [ ] Acessibilidade: modo daltônico para elementos, tamanho de texto

## No radar (não agora)
Co-op, nuvem, Passe de Missões e loja de gems (gems nunca compram nada aleatório), guildas, Capacitor para lojas,
classificação indicativa e ECA Digital antes de qualquer monetização.
