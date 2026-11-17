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

### Fase 9c — Pedidos do jogador (nov/2026) ✔
- [x] Venda pede confirmação (2 toques); herói pode ser arrastado; herói não trava mais embaixo nos mapas altos
- [x] "Próxima fase" abre o cartão da fase no mapa (missões, herói, estratégia)
- [x] **Sem Reforço infinito**: nível 3 é o teto; depois só Evoluir, Fundir ou Vender
- [x] Equilíbrio inspirado em TDs clássicos: congelar deixa imune a novo congelamento por 3 s; Nevasca só desacelera (não congela); formas finais mais caras (280–320) e versões "sem parar" de fogo/raio mais fracas; fusão 200

### Fase 10 — Polimento e balanceamento ✔
- [x] Música por código (desde a Fase 6) e **vozes de inimigos**: som de queda próprio por tipo (gosma, golem, morcego, esqueleto, lobo), mais grave nos maiores
- [~] Tutorial jogável de 60 s: **cortado** — as 18 dicas da Região 1 já ensinam jogando
- [x] `npm run balance` também roda 4 heróis × 2 escolhas de bênção em todas as fases; `docs/PLAYTEST.md` com o roteiro de teste
- [x] Acessibilidade: todo estado tem ícone próprio (chama nova para Queimando), opção **Textos maiores**
- [x] Ajustes: Arcanista (ataque 13, Catalisar 36), Sacerdotisa (aura +25%, Bênção +45%), Devorador de Éter 3000 de vida

### Fase 11 — Mapa de Éter e tutorial completo ✔
- [x] **Mapa de Éter** (tela inicial): cartões das regiões, Modos de jogo (Fenda Infinita, Desafio do dia, vaga "Novo modo"), Relicário/Códice/Opções
- [x] Região nova abre com **3 estrelas em todas as fases** da anterior (quem já jogou lá mantém o acesso)
- [x] **Região 1 = tutorial**: 1 Arqueira → 2 + Fogo e Planta → 3 + Gelo e Raio → 4 Evoluir e Fundir → 5 tudo (runas, bênçãos, chefe)
- [x] Até vencer a fase 5: só o Arcanista, sem relíquias, talentos, Relicário, Fenda e Desafio do dia

### Fase 12 — Região 3: Cumes Nevados ✔
- [x] 5 fases (12 ondas) em mapas altos novos, chão de neve e pinheiros, músicas próprias
- [x] **Ponte levadiça**: tocar ergue a ponte e segura os monstros que andam por 4 s (recarga 15 s)
- [x] Inimigos novos: **Monge do Gelo** (cura quem está perto; nunca o chefe) e **Gárgula de Pedra** (voa, resiste a físico/fogo, fraca a raio)
- [x] Chefe final **Titã de Obsidiana**: escudos SUPERCONDUÇÃO → GEADA ESPINHOSA → SOBRECARGA → ESTILHAÇO

### Fase 13 — Mapa de verdade e Expedição de Éter ✔
- [x] **Mapa de Éter pintado**: um mundo só (campina, rio, planície de âmbar, picos nevados, terras desconhecidas) cortado por uma
      **trilha tracejada**; cada parada da trilha é uma região (sub-mapa de 5 fases). Trilha clara até onde o jogador chegou, apagada depois
- [x] Modos de jogo viram paradas em caminhos laterais pontilhados: Fenda Infinita, Desafio do dia e Expedição
- [x] O herói escolhido espera na região da vez; árvores de cada terra; bússola; ponte sobre o rio
- [x] **Expedição de Éter** (modo novo, depois do tutorial): 3 batalhas seguidas; vidas e Bênçãos seguem de uma para a outra;
      monstros ×1,15 / ×1,6 / ×2,2 (era ×1 / ×1,2 / ×1,45: fácil demais, as Bênçãos acumuladas passavam por cima); antes de cada batalha, 1 de 2 **trilhas** (fase + pacto com prêmio e preço)
- [x] 5 pactos: Tranquila (+3 vidas), Horda (+25% vida dos monstros, 1 Bênção extra), Mercador (+200 ouro, −4 vidas),
      Voto (só 3 tipos de torre, +35% de dano), Tesouro (+40% ouro, +15% vida dos monstros)
- [x] Moedas 40 → 70 → 140; perder uma batalha encerra a expedição; a expedição fica salva entre as batalhas
- *Aceite:* depois da campanha, existe um motivo novo para "só mais uma" que muda a cada vez.

---

# Roadmap 3.0 — o que vem (proposto em nov/2026)

> Ideia central: o jogo já tem bastante **conteúdo**; o que falta é **cada partida contar uma história diferente** e o
> **lugar das torres importar mais**. As fases abaixo estão em ordem de impacto por esforço.

### Fase 14 — Vínculos de Éter (o lugar das torres importa) ✔
- [x] Torres de **tipos diferentes** em espaços vizinhos (até 250 px) ficam ligadas por um **fio de luz**
- [x] Regra única: a cada 5º disparo, a torre acerta também com o **elemento da vizinha** (35% do dano dela, mais a queimadura,
      o resfriado ou a raiz). Com 2 ou mais vizinhas, reveza. Ex.: Arqueiro entre Braseiro e Gélido faz DERRETIMENTO sozinho
- [x] Ao tocar num espaço vazio, o menu mostra os fios que seriam criados e escreve "Vínculo com: ..."
- [x] Entra no tutorial a partir da fase 4 (dica própria); fases 1 a 3 continuam sem vínculos
- [x] Equilíbrio: medido com os robôs antes e depois; Região 3 ganhou ~8% de vida para compensar
- [~] Desafio por fase ligado a vínculos: **cortado** (mexeria nos desafios já concluídos no save)
- *Mudou em relação à proposta:* em vez de um efeito por par, uma regra só que vale para todos os pares (mais fácil de aprender).

### Fase 14b — "Está muito fácil" (pedido do jogador, nov/2026) ✔
O jogador venceu a Expedição com 3 torres (Nevasca + Senhor do Trovão + 1), 20 vidas e 4.374 de ouro sobrando;
88% do dano veio do Trovão e 372 das 376 reações foram SUPERCONDUÇÃO. Reproduzido com robô (npm run probe).
- [x] **Trava de repetição**: a mesma reação não se repete no mesmo monstro por 2,5 s (outra reação pode). Misturar combos vale mais que repetir um
- [x] Trovão: nível 2 com 3 saltos, nível 3 com 4 saltos e 25 de dano; Supertensão +50% de saltos (era o dobro); Senhor do Trovão atinge 4 alvos (eram 6) com ×2,2
- [x] Golpes finais mais fracos: Tumba Glacial ×5 (era ×7), Meteoro ×3 (era ×4); SOBRECARGA espalha 40% (era 60%)
- [x] Sacerdotisa: aura +15% (era +25%), Bênção +30% (era +45%)
- [x] Monstros com mais vida nas Regiões 2 e 3 (de +10% a +45% conforme a fase); Expedição ×1,1 / ×1,45 / ×1,9
- [x] Robôs novos: "poucas torres evoluídas", "a defesa do jogador" e "3 torres e depois expande", com o ouro que sobra
- *Medida de sucesso:* 3 torres evoluídas perdem na maioria das fases; quem continua construindo vence com pouco ouro sobrando.
- *Risco assumido:* os robôs antigos (que não evoluem torres) agora perdem quase toda a Região 2 e 3. Falta o teste do jogador.

### Fase 15 — Expedição 2.0 (a aventura de verdade) ✔
- [x] A expedição vira uma **trilha de 5 paradas** desenhada no cartão: Batalha → Parada → Batalha → Parada → **Chefe final**
- [x] Paradas que não são batalha (1 de 2 por vez): **Acampamento** (+5 vidas), **Mercador** (1 de 3 Bênçãos por 40 moedas),
      **Santuário** (1 de 2 Bênçãos raras/épicas por 3 vidas); sempre dá para passar direto
- [x] **Chefe final sorteado** entre as fases de chefe já abertas (Arauto, Sentinela, Devorador, Titã)
- [x] **Sequência** de expedições completas seguidas e melhor sequência (perder ou desistir zera)
- [x] Monstros por parada: ×1 / ×1,2 / ×1,45 (as fases das Regiões 2 e 3 já ficaram mais duras na Fase 14b); moedas 40 / 70 / 160
- [~] Enigma (aposta de vidas) e relíquias temporárias: **cortados** — o Santuário já é a aposta, e as Bênçãos já são o poder temporário
- *Nota:* expedições em andamento salvas pela versão de 3 batalhas são descartadas (formato novo).

### Fase 16 — Região 4: Ilhas do Vazio ✔
- [x] 5 fases de 12 ondas em mapas altos novos (Arquipélago, Deriva, Estilhaços, Redemoinho com Comporta, Nexo com Ponte)
- [x] **Clima que muda no meio da partida**: Chuva (Fogo −40%, Raio +30%, nada queima), Ventania (voadores +50% de
      velocidade, flechas +30%), Eclipse (reações em dobro por 10 s). O aviso aparece uma onda antes
- [x] **Prisma do Vazio**: chefe que troca de elemento 4 vezes (resiste 85% a um, +50% de dano de outro), em ordem sorteada
- [x] **Diabrete Ladrão**: rouba 20 de ouro no meio do caminho e corre; abatido, devolve o dobro
- [x] Mapa de Éter: ilhas flutuantes no topo e um novo "???" depois da Região 4; Expedição pode sortear o Prisma como chefe final
- *Calibragem:* robôs de 3 torres perdem todas as 5 fases (como nos Cumes); robôs simples chegam às ondas 7–12

### Fase 17 — Sexta torre: Vento ✔
- [x] **Torre do Vento** (moinho): cada sopro empurra o monstro para trás e o deixa **Soprado**; nível 3 = **Tufão**
      (a cada 4º sopro, atinge todos em volta). Empurrão com pausa de 1,5 s por monstro; chefes quase não se movem
- [x] 3 reações novas: **LABAREDA** (Vento + Queimando: o fogo pula), **VENDAVAL GELADO** (Vento + Resfriado: o frio se
      espalha), **TORMENTA** (Raio + Soprado: ×1,75 e arremesso). O vento sempre deixa Soprado, mesmo quando reage
- [x] 2 evoluções: **Olho do Furacão** (a cada 8 s empurra todos no alcance) e **Brisa Cortante** (sopro constante)
- [x] Fase bônus **Vale dos Ventos** em Vellmora (abre ao fim do tutorial); vencer libera a torre em todo o jogo
- [~] Fusões com o Vento: **adiadas** (as 5 fusões atuais continuam)
- *Calibragem:* builds com vento rendem parecido com as clássicas; 3 torres com vento perdem nas Regiões 2–4

### Fase 18 — Caçada de Chefes e Semana Mutante
- [ ] **Caçada**: todos os chefes em fila, com uma loja curta entre eles; recorde de tempo
- [ ] **Semana Mutante**: toda semana uma regra maluca igual para todos (torres custam metade mas não se vendem;
      só reações causam dano; monstros gigantes e lentos...)

### Fase 19 — O mundo ganha voz
- [ ] Cenas curtas pintadas ao abrir cada região; falas dos chefes ao entrar e ao cair; diário do herói no Códice
- [ ] O herói **caminha pela trilha** do Mapa de Éter até a região tocada; pequenos eventos no mapa (gosma dourada passeando)

### Fase 20 — Maestria e vitrine
- [ ] Maestria por torre e por herói: **aparências** ganhas jogando (nunca poder, nunca compradas com sorte)
- [ ] Álbum de conquistas com metas longas; "foto da vitória" para compartilhar a build

### Qualidade contínua (entre as fases)
- [ ] Robôs de teste que usam Comporta, Ponte e Expedição
- [ ] Revisão de dificuldade por região a cada entrega; conferir no celular fraco (Modo econômico)

## No radar (não agora)
Co-op, nuvem, Passe de Missões e loja de gems (gems nunca compram nada aleatório), guildas, Capacitor para lojas,
classificação indicativa e ECA Digital antes de qualquer monetização.
